// jarvis, just another reusable verbal interpreter shell

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
    const asyncHanlder = async (context, data) => {
      return handler(context, data);
    };
    this.commands.push({
      command: command, 
      handler: asyncHanlder
    });
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
    let found = null;
    this.commands.forEach((command) => {
      if (data.includes(command.command))
        found = command;
    });
    return found;
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