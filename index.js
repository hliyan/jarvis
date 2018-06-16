// jarvis, just another reusable verbal interpreter shell

class Jarvis {
  constructor() {
    this.commands = {}; // list of registered commands
    this.activeCommand = null; // currently active command
    this.state = {}; // state variables for currently active command
  }

  /**
   * Registers a new command with Jarvis
   * USAGE: jarvis.addCommand({ command: 'test', handler: () => {}});
   */
  addCommand({command, handler}) {
    const asyncHanlder = async (context, data) => {
      return handler(context, data);
    };
    this.commands[command] = {
      command: command, 
      handler: asyncHanlder
    };
  }

  /**
   * To be called only by command handlers, to indicate the start of
   * an interactive shell session
   */
  startCommand(command) {
    this.activeCommand = this._findCommand(command);
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

  _findCommand(data) {
    for (let c in this.commands) {
      if (data === c) {
        return this.commands[c];
      }
    }
  }

  /**
   * Sends a command to the shell
   */
  async send(data) {
    if (this.activeCommand) {
      if (data === '..') {
        const out = 'Done with ' + this.activeCommand.command + '.';
        this.endCommand();
        return out;
      }
      return await this.activeCommand.handler(this, data);
    }

    const command = this._findCommand(data);
    return command ? await command.handler(this, data): null;
  }
}

module.exports = Jarvis;