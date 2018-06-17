// jarvis, just another rudimentary verbal interface shell

// converts 'hello "John Doe"' to ['hello', 'John, Doe']
const tokenize = (line) => {
  const tokens = line.match(/\w+|"[^"]+"/g);
  for (let i = 0; i < tokens.length; i++) {
    tokens[i] = tokens[i].replace(/"/g, '');
  }
  return tokens;
};

// converts 'hello <name>' to 
// [{value: 'hello', isArg: false}, {value: name, isArg: true}]
const idTokens = (commandStr) => {
  const tokens = [];
  commandStr.split(' ').forEach((token) => {
    tokens.push({
      value: token.replace(/<|>/g, ''),
      isArg: token.includes('<')
    });
  });
  return tokens;
};

// checks tokens against all the patterns in the command
// returns args if match, else null
const parse = (command, inputTokens) => {
  for (let i = 0; i < command.patterns.length; i++) { // for each pattern
    const patternTokens = command.patterns[i].tokens;
    const args = {};

    let match = true;
    for (let j = 0; j < patternTokens.length; j++) { // for each token in pattern
      const patternToken = patternTokens[j];
      if (patternToken.isArg) {
        args[patternToken.value] = inputTokens[j]; 
      } else {
        if (inputTokens[j] !== patternToken.value) {
          match = false;
          break;
        }
      }
    }
    if (match)
      return {args};  
  }
  return null;
};

class Jarvis {
  constructor() {
    this.commands = []; // list of registered commands
    this.activeCommand = null; // currently active command
    this.state = {}; // state variables for currently active command
  }

  /**
   * Registers a new command with Jarvis
   * USAGE: jarvis.addCommand({ command: 'test', handler: () => {}});
   */
  addCommand({command, handler, aliases}) {
    const patterns = [];
    patterns.push({tokens: idTokens(command)});
    if (aliases) {
      aliases.forEach((alias) => {
        patterns.push({tokens: idTokens(alias)})
      });
    }

    this.commands.push({
      command: command, 
      handler: handler,
      tokens: idTokens(command),
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
      if (parse(command, inputTokens))
        return command;
    }
    return null;
  }

  // if command is null, then consider as accepting prompted input
  // for the active command
  async _runCommand(command, line) {
    const inputTokens = tokenize(line);
    const handler = command ? command.handler : this.activeCommand.handler;

    return await handler({
      context: this,
      line,
      tokens: inputTokens,
      args: command ? parse(command, inputTokens).args : {}
    });
  }

  /**
   * Sends a command to the shell
   */
  async send(line) {
    if (this.activeCommand) {
      if (line === '..') {
        const out = 'Done with ' + this.activeCommand.command + '.';
        this.endCommand();
        return out;
      }
      return this._runCommand(null, line);
    }

    const command = this._findCommand(line);
    return command ? this._runCommand(command, line) : null;
  }
}

module.exports = Jarvis;