// jarvis, just another reusable verbal interpreter shell

const tokenize = (line) => {
  const tokens = line.match(/\w+|"[^"]+"/g);
  for (let i = 0; i < tokens.length; i++) {
    tokens[i] = tokens[i].replace(/"/g, '');
  }
  return tokens;
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
  addCommand({command, handler}) {
    const asyncHanlder = async (data) => {
      return handler(data);
    };
    this.commands.push({
      command: command, 
      handler: asyncHanlder,
      tokens: tokenize(command)
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
    const tokens = tokenize(line);
    for (let i = 0; i < this.commands.length; i++) {
      const command = this.commands[i];
      let match = true;
      for (let j = 0; j < command.tokens.length; j++) {
        if (tokens[j] !== command.tokens[j]) {
          match = false;
          break;
        }
      }
      if (match)
        return command;
    }
    return null;
  }

  async _runCommand(command, line) {
    return await command.handler({
      context: this,
      line,
      args: tokenize(line)
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
      return this._runCommand(this.activeCommand, line);
    }

    const command = this._findCommand(line);
    return command ? this._runCommand(command, line) : null;
  }
}

module.exports = Jarvis;