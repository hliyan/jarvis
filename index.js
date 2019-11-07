const URL = require('url');
const events = require('events');
const {
  parseCommand,
  tokenize,
  parseInputTokens,
  parseMacroInputTokens,
  parseMacroSubCommand,
  parseConstants,
  parseScript,
  validateScript,
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
    this.isInStartBlock = false; // state variable to check whether inside start block
    this.importStack = [__filename]; // use at the time of interpretation to keep track of the import hierarchy in files, default value as current file which used in CLI mode
    this.baseScriptPath = __filename; // the path of the file with which jarvis was invoked. used for resolving import paths, default value as current file which used in CLI mode
    this.importScriptDetails = {}; // contains the imported constants and macros based on the imported script path, USAGE: {'./test.jarvis': ['BASE_URL']}
    this.eventEmitter = new events.EventEmitter(); // use at the time of script interpretation to emit the responses in run time
  }

  /**
   * Checks for available scripts to switch mode to script mode if a
   * script with specified extension is provided
   * re-initialize the base script path according to given script
   * USAGE: jarvis.addScriptMode('jarvis', 'script.jarvis');
   */
  async addScriptMode(extension, script) {
    if (script && validateScript(extension, script)) {
      this.baseScriptPath = script;
      this.importStack = [script];
      return await this._runScript(script);
    }
    return null;
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
   * if command is null, then consider as accepting prompted input
   * for the active command
   */
  async _runCommand(command, line) {
    line = parseConstants(line, this.constants);
    const inputTokens = tokenize(line);
    const handler = command ? command.handler : this.activeCommand.handler;

    return await handler({
      context: this,
      line,
      tokens: inputTokens,
      args: command ? parseInputTokens(command, inputTokens).args : {}
    });
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
       * checks whether the `line` is in the format of import script
       * if so it extracts the importing resource (`constant` or `macro`) and the `path`
       * then import the file if it is not already imported
       */
      const importParams = line.match(/(.+) is from ['"](.+)['"]/i);
      if (importParams) {
        const [, resource, relativeScriptPath] = importParams;
        const scriptPath = URL.resolve(this.baseScriptPath, relativeScriptPath);

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
       * if so it extracts the `key` and `value` and do the constant validations
       * if a valid constant, add to active constant storage (temporally)
       */
      const constantParams = line.match(/(.+) is (.+)/i);
      if (constantParams) {
        const [, key, value] = constantParams;

        if (this.constants[key]) {
          return `'${key}' constant already exists!`
        }
        else if (key === key.toUpperCase()) {
          let constant = { key, value };
          this.activeContext[currentScriptPath].push(constant);
          return;
        } else {
          return 'A constant name should be in block letters.'
        }
      }
    }

    return await this._execute(line);
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
      line = parseConstants(line, this.constants);
      line = parseMacroSubCommand(line, macro.args);
      subCommandsStatus.push(await this._execute(line));
    }
    return subCommandsStatus;
  }

  /**
   * Find the macro by sending macro name
   */
  _findMacro(line) {
    line = parseConstants(line, this.constants);
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
}

module.exports = Jarvis;