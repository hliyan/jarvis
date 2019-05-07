const { 
  parseCommand, 
  tokenize, 
  parseInputTokens
} = require("./src/utils");

class Jarvis {
  constructor() {
    this.commands = []; // list of registered commands
    this.activeCommand = null; // currently active command
    this.state = {}; // state variables for currently active command

    this.activeMacro = false;
    this.macros = []; // list of registered macros
    this.macroName = null;
    this.statements = []
  }

  _activeMacros(command){
    console.log("You are now entering a macro. Type the statements, one line at a time.")
    this.activeMacro = true

    let str = "how to intoduce ";
    this.macroName = command.substr(str.length+1)
    this.statements = []
  }

  _recordMacro(command){
    if(command === 'end'){
      this.activeMacro = false;
      this.macros.push({
        macroName: this.macroName,
        sequence: this.statements
      })
      console.log('macro "',this.macroName,'" has been added.')
      return
    }
    return this.statements.push(command)
  }

  _findMacro(macroName){
    for (let i = 0; i < this.macros.length; i++) {
      if(this.macros[i].macroName === macroName){
        const sequence = this.macros[i].sequence;
        return sequence;
      }
    }
    return null;
  }


  async _runMacro(command){
    let str = "execute"
    const sequence = this._findMacro(command.substr(str.length+1))
  
    if(sequence) {
      let res = []
      for (let i = 0; i < sequence.length; i++){
        const result = await this.send(sequence[i])
        res.push(result)
      }
      return res;
    }
    return null;
  }


  /**
   * Registers a new command with Jarvis
   * USAGE: jarvis.addCommand({ command: 'test', handler: () => {}});
   */
  addCommand({command, handler, aliases}) {
    const patterns = [];
    patterns.push({tokens: parseCommand(command)});
    if (aliases) {
      aliases.forEach((alias) => {
        patterns.push({tokens: parseCommand(alias)})
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
      if (parseInputTokens(command, inputTokens))
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
      args: command ? parseInputTokens(command, inputTokens).args : {}
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

    if(line.startsWith("how to introduce")){
      return this._activeMacros(line)
    }

    if(this.activeMacro){
      return this._recordMacro(line)
    }
    else if(line.startsWith('execute')){
      return this._runMacro(line)
    }
    else{
      const command = this._findCommand(line);
      return command ? this._runCommand(command, line) : null;
    }
  }

}

module.exports = Jarvis;