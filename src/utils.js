// jarvis, just another rudimentary verbal interface shell
// converts 'hello "John Doe"' to ['hello', 'John, Doe']
const tokenize = (line) => {
  const tokens = line.match(/"([^"]+)"|\S+/g);
  for (let i = 0; i < tokens.length; i++) {
    tokens[i] = tokens[i].replace(/"/g, '');
  }
  return tokens;
};
exports.tokenize = tokenize;

// converts 'hello <name>' to 
// [{value: 'hello', isArg: false}, {value: name, isArg: true}]
const parseCommand = (commandStr) => {
  const tokens = [];
  commandStr.split(' ').forEach((token) => {
    tokens.push({
      value: token.replace(/<|>/g, ''),
      isArg: token.includes('<')
    });
  });
  return tokens;
};
exports.parseCommand = parseCommand;

// checks tokens against all the patterns in the command
// returns args if match, else null
const parseInputTokens = (command, inputTokens) => {
  for (let i = 0; i < command.patterns.length; i++) { // for each pattern
    const patternTokens = command.patterns[i].tokens;
    const args = {};
    let match = true;
    for (let j = 0; j < patternTokens.length; j++) { // for each token in pattern
      const patternToken = patternTokens[j];
      if (patternToken.isArg) {
        args[patternToken.value] = inputTokens[j];
      }
      else {
        if (inputTokens[j] !== patternToken.value) {
          match = false;
          break;
        }
      }
    }
    if (match)
      return { args };
  }
  return null;
};

exports.parseInputTokens = parseInputTokens;