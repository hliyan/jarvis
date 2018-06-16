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
    this.commands[command] = {command, handler};
  }

  /**
   * To be called only by command handlers, to indicate the start of
   * an interactive shell session
   */
  start(command) {
    this.activeCommand = command;
  }

  /**
   * To be called only by command handlers, to indicate the end of
   * an interactive shell session
   */
  end() {
    this.activeCommand = null;
    this.state = {};
  }

  /**
   * To be called only by command handlers for an interactive shell command
   * Can be used to set variables for the duration of that shell command
   */
  setState(data) {
    Object.assign(this.state, data);
  }

  /**
   * Sends a response back to the sender of the command
   */
  async send(data) {
    if (this.activeCommand) {
      if (data === '..') {
        const out = 'Done with ' + this.activeCommand + '.';
        this.end();
        return out;
      }
      return await this.commands[this.activeCommand].handler(this, data);
    }

    for (let c in this.commands) {
      if (data === c || (data.indexOf(c) == 0 && data[c.length] == ' ')) {
        return await this.commands[c].handler(this, data);
      }
    }
    return null;
  }
}

module.exports = Jarvis;