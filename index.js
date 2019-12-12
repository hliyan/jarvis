const URL = require('url');
const events = require('events');
const {
  parseCommand,
  tokenize,
  parseInputTokens,
  parseMacroInputTokens,
  parseMacroSubCommand,
  parseScript,
  validateScript,
  importJson,
  validateEnvFileName
} = require("./src/utils");

class Jarvis {
  constructor() {
    this.commands = []; // list of registered commands
    this.macros = []; // list of registered macros
    this.activeCommand = null; // currently active command
    this.activeMacro = null; // currently active macro
    this.activeContext = null; // temporally holding details of currently active constants and imports in command `in this context`
    this.state = {}; // state variables for currently active command
    this.constants = {}; // registered constants
    this.environmentVariables = {};// store extracted environment variables
    this.isInStartBlock = false; // state variable to check whether inside start block
    this.importStack = [__filename]; // use at the time of interpretation to keep track of the import hierarchy in files, default value as current file which used in CLI mode
    this.baseScriptPath = __filename; // the path of the file with which jarvis was invoked. used for resolving import paths, default value as current file which used in CLI mode
    this.importScriptDetails = {}; // contains the imported constants and macros based on the imported script path, USAGE: {'./test.jarvis': ['BASE_URL']}
    this.eventEmitter = new events.EventEmitter(); // use at the time of script interpretation to emit the responses in run time
  }

  /**
   * Checks for available scripts to switch mode to script mode if a
   * script and env file(optional parameter) with specified extension is provided
   * re-initialize the base script path according to given script
   * USAGE: jarvis.addScriptMode('jarvis', 'script.jarvis', '.jarvisrc');
   */
  async addScriptMode(extension, script, envFile) {
    if (!(script && validateScript(extension, script))) {
      return null;
    }
    if (envFile && validateEnvFileName(`${extension}rc`, envFile)) {
      const res = await this._loadEnvFile(envFile);
      if (res.error) {
        return res.error;
      }
    }
    this.baseScriptPath = script;
    this.importStack = [script];
    return await this._runScript(script);
  }

  /**
   * Registers a new command with Jarvis
   * USAGE: jarvis.addCommand({ command: 'test', handler: () => {}});
   */
  addCommand({ command, handler, aliases }) {
    const patterns = [];
    patterns.push({ tokens: parseCommand(command) });
    if (aliases) {
      aliases.forEach((alias) => {
        patterns.push({ tokens: parseCommand(alias) })
      });
    }

    this.commands.push({
      command: command,
      handler: handler,
      tokens: parseCommand(command),
      patterns
    });
  }

  /**
   * To be called only by command handlers, to indicate the start of
   * an interactive shell session
   */
  startCommand(commandName) {
    this.activeCommand = this._findCommand(commandName);
  }

  /**
   * To be called only by command handlers, to indicate the end of
   * an interactive shell session
   */
  endCommand() {
    this.activeCommand = null;
    this.state = {};
  }

  /**
   * To be called only by command handlers for an interactive shell command
   * Can be used to set variables for the duration of that shell command
   */
  setCommandState(data) {
    Object.assign(this.state, data);
  }


  _findCommand(line) {
    const inputTokens = tokenize(line);
    for (let i = 0; i < this.commands.length; i++) {
      const command = this.commands[i];
      if (parseInputTokens(command, inputTokens)) {
        return command;
      }
    }
    return null;
  }

  /**
   * checks whether the constant format is found in the tokens
   * if found replace the constant with the corresponding value
   * else leaves the token as it is
   * returns the parsed token array at the end
   */
  _parseConstants(tokens) {
    return tokens.map((token) => {
      const innerConstants = token.match(/\$[A-Z_][0-9A-Z_]*/g);
      if (innerConstants) {
        /**
         * if a token is an exact constant match
         * returns the corresponding value of the constant
         * return value is either a string or an object
         * ex: token = "$HOST" returns "google.lk"
         * ex: token = "$APP_OBJECT" returns {name: "JARVIS"}
         */
        if (innerConstants.length === 1 && token === innerConstants[0]) {
          const key = token.replace('$', '');
          const value = this.constants[key];
          return value ? value : token;
        }

        /**
         * if a token string contains constants within the string
         * returns the constant replaced string
         * return value is a string (objects are stringified)
         * ex: token = "$HOST/$API_VERSION/index.html" returns "google.lk/v1/index.html"
         * ex: token = "Object: $JSON_OBJECT" returns "Object: {"name": "JARVIS"}"
         */
        innerConstants.forEach((innerConstant) => {
          const key = innerConstant.replace('$', '');
          const value = this.constants[key];
          if (value) {
            token = (typeof value === 'object') ? token.replace(innerConstant, JSON.stringify(value)) : token.replace(innerConstant, value);
          }
        })
      }
      return token;
    })
  }

  /**
   * parses the constant to corresponding values
   * if command is null, then consider as accepting prompted input
   * for the active command
   * then run the command handler with the arguments
   */
  async _runCommand(command, line) {
    const inputTokens = tokenize(line);
    const constantParsedTokens = this._parseConstants(inputTokens);
    const handler = command ? command.handler : this.activeCommand.handler;

    return await handler({
      context: this,
      line,
      tokens: inputTokens,
      args: command ? parseInputTokens(command, constantParsedTokens).args : {}
    });
  }

  /**
   * validate the constant format,
   * if valid, add the constant to active context
   * else return an error message
   */
  _setConstantInActiveContext(key, value) {
    if (!/[A-Z_][0-9A-Z_]/.test(key)) {
      return 'A constant name should be in block letters.';
    }
    if (this.constants[key]) {
      return `'${key}' constant already exists!`;
    }
    // get the top most value of the stack which is the currently active script
    const currentScriptPath = this.importStack[this.importStack.length - 1];
    let constant = { key, value };
    this.activeContext[currentScriptPath].push(constant);
  }

  /**
   * Sends a command to the shell
   */
  async send(line) {
    if (!line) {
      return null;
    }
    line = line.trim();

    if (this.activeCommand) {
      if (line === '..') {
        const out = 'Done with ' + this.activeCommand.command + '.';
        this.endCommand();
        return out;
      }
      return this._runCommand(null, line);
    }

    if (line.startsWith("how to ")) {
      let macroCommand = line.replace('how to', '').trim();
      if (this._findMacro(macroCommand)) {
        return `Macro name already exists!`
      }

      this.activeMacro = {
        command: macroCommand,
        subCommands: []
      }

      const out = 'You are now entering a macro. Type the statements, one line at a time. When done, type \'end\'.'
      return out;
    }

    if (this.activeMacro) {
      if (line === 'end') {
        this._addMacro(this.activeMacro);
        const out = `Macro "${this.activeMacro.command}" has been added.`;
        this.activeMacro = null;
        return out;
      }

      if (this._findCommand(line) || this._findMacro(line)) {
        this.activeMacro.subCommands.push(line);
        return;
      } else {
        return `Not a valid Command/Macro.`
      }
    }

    // get the top most value of the stack which is currently active script
    const currentScriptPath = this.importStack[this.importStack.length - 1];

    /**
     * active context stores currently active context details
     * temporally keeps the details of constant definitions in import hierarchy based on the script path
     * USAGE: {'./script.jarvis': [{key: 'BASE_URL', value: 'www.google.com'}]}
     */
    if (line.startsWith("in this context")) {
      this.activeContext = {
        ...this.activeContext,
        [currentScriptPath]: []
      }
      const out = 'You are now entering constants. Type the constants, one line at a time. When done, type \'end\'.'
      return out;
    }

    if (this.activeContext && this.activeContext[currentScriptPath]) {
      /**
       * adds temporally stored constants to global constants
       * clear the active context when traverse back to the base script
       */
      if (line === 'end') {
        let keyList = [];
        this.activeContext[currentScriptPath].forEach(constant => {
          this.constants[constant.key] = constant.value;
          keyList.push(constant.key);
        })

        if (currentScriptPath === this.baseScriptPath && this.activeContext != null) {
          this.activeContext = null;
        }
        const out = `Constants "${keyList}" have been added.`;
        return out;
      }

      /**
       * handle constant imports from env file
       * check whether the constant is available within loaded constants from env file
       */
      const envParams = line.match(/(.+) is from env/);
      if (envParams) {
        const [, envKey] = envParams;
        if (!this.environmentVariables[envKey]) {
          return `${envKey} is not defined in env file!`
        }
        this._setConstantInActiveContext(envKey, this.environmentVariables[envKey]);
        return;
      }

      /**
       * checks whether the `line` is in the format of import script or JSON import
       * if so it extracts the importing resource (`constant`, `macro` or `JSON`) and the `path`
       * then import the file if it is not already imported or set the constant if a JSON import
       */
      const importParams = line.match(/(.+) is from ['"](.+)['"]/i);
      if (importParams) {
        const [, resource, relativeScriptPath] = importParams;
        const scriptPath = URL.resolve(this.baseScriptPath, relativeScriptPath);

        /**
         * checks whether the importing file is a JSON
         * if so parse the JSON file to a JSON object
         * then save the JSON object as a constant
         */
        if (scriptPath && /(.)+.json$/gi.test(scriptPath)) {
          const jsonObject = importJson(scriptPath);
          return this._setConstantInActiveContext(resource, jsonObject);
        }

        /**
         * checks whether the importing file is already imported
         * if not add the script path to stack and run the importing script
         */
        if (!this.importScriptDetails[scriptPath]) {
          this.importScriptDetails[scriptPath] = [];
          this.importStack.push(scriptPath);
          await this._runScript(scriptPath);
          this.importStack.pop();
        }

        /**
         * TODO:
         * whitelisting only the imported constants and macros
         */
        this.importScriptDetails[scriptPath].push(resource);
        return `Script: ${scriptPath} imported`;
      }

      /**
       * checks whether the `line` is in the format of constant definition
       * if so it extracts the `key` and `value` and set it in the active context
       */
      const constantParams = line.match(/(.+) is ['"](.+)['"]/i);
      if (constantParams) {
        const [, key, value] = constantParams;
        return this._setConstantInActiveContext(key, value);
      }
    }

    return await this._execute(line);
  }

  /**
   * Wrapper for the event emitter
   */
  on(event, callback) {
    this.eventEmitter.on(event, callback);
  }

  /**
   * if the 'line' is not found in commands
   * it will search in macros
   */
  async _execute(line) {
    const command = this._findCommand(line);
    if (command) {
      return this._runCommand(command, line);
    } else {
      const macro = this._findMacro(line);
      return macro ? await this._runMacro(macro) : null;
    }
  }

  /**
   * Register a new macro with JARVIS
   * USAGE: jarvis._addMacro(macro);
   */
  _addMacro({ command, subCommands }) {
    this.macros.push({
      command: command,
      tokens: parseCommand(command),
      subCommands: subCommands,
    })
  }

  /**
   * Execute sub commands of the macro
   */
  async _runMacro(macro) {
    let subCommandsStatus = [];
    for (let line of macro.subCommands) {
      line = parseMacroSubCommand(line, macro.args);
      subCommandsStatus.push(await this._execute(line));
    }
    return subCommandsStatus;
  }

  /**
   * Find the macro by sending macro name
   */
  _findMacro(line) {
    const inputTokens = tokenize(line);
    for (let i = 0; i < this.macros.length; i++) {
      const macro = this.macros[i];
      const args = parseMacroInputTokens(macro, inputTokens);
      if (args)
        return Object.assign({}, macro, args)
    }
    return null;
  }

  /**
   * Execute a provided script
   */
  async _runScript(script) {
    let res = [];
    const commands = parseScript(script);
    for (const command of commands) {
      if (this._isInGlobalScope()) {
        if (command.startsWith("start")) {
          this.isInStartBlock = true;
          continue;
        }
        else if (command === 'end') {
          this.isInStartBlock = false;
          continue;
        }
      }
      if (this._isInExecutableContext(command)) {
        const response = await this.send(command);
        /**
         * Emits the response along with the corresponding command
         * so the listener can get the response via `command` event in run time
         */
        if (this.isInStartBlock) {
          this.eventEmitter.emit('command', { command, response });
        }
        res.push(response);
      }
    }
    return res;
  }

  /**
   * Check whether a specific line is in executable context
   */
  _isInExecutableContext(line) {
    // line is sent to shell if inside a start block or if an active macro/a context exist or if special keyword
    if (this.isInStartBlock || !this._isInGlobalScope() || line.startsWith('in this context')
      || line.startsWith('how to')) {
      return true;
    }
  }

  /**
   * Check for global scope
   */
  _isInGlobalScope() {
    if (!this.activeContext && !this.activeMacro) {
      return true;
    }
  }

  /**
   * Load a provided env file
   * Save env variables as constants
   * returns an error for invalid env files
   */
  async _loadEnvFile(envFile) {
    let fileContent;
    try {
      fileContent = parseScript(envFile);
    } catch (error) {
      return { error: 'Could not read env file from specified location!' };
    }
    //check whether the first and last lines of the file matches the required syntax
    if (!(fileContent[0] === "in this context" && fileContent[fileContent.length - 1] === "end")) {
      return { error: 'Invalid syntax in env file!' };
    }
    for (let line of fileContent) {
      line = line.trim();
      const matches = this._matchConstantFormat(line);
      if (matches) {
        const [, key, value] = matches;
        this.environmentVariables[key] = value;
      }
    }
    return { success: 'Successfully loaded environment file!' }
  }

  /**
   * checks whether a given `line` is in the format of a constant definition
   * if so returns the matches
   */
  _matchConstantFormat(line) {
    return line.match(/(.+) is ['"](.+)['"]/i);
  }
}

module.exports = Jarvis;
