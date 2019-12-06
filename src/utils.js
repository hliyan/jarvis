// jarvis, just another rudimentary verbal interface shell
const fs = require("fs");
const path = require("path");

// converts 'hello "John Doe"' to ['hello', 'John Doe']
const tokenize = line => {
  const tokens = line.match(/"([^"]+)"|\S+/g);
  for (let i = 0; i < tokens.length; i++) {
    tokens[i] = tokens[i].replace(/"/g, '');
  }
  return tokens;
};
exports.tokenize = tokenize;

// converts 'hello $name' to 
// [{value: 'hello', isArg: false}, {value: name, isArg: true}]
const parseCommand = (commandStr) => {
  const tokens = [];
  commandStr.split(" ").forEach(token => {
    tokens.push({
      value: token.replace(/\$/g, ""),
      isArg: token.includes("$")
    });
  });
  return tokens;
};
exports.parseCommand = parseCommand;

// checks tokens against all the patterns in the command
// returns args if match, else null
const parseInputTokens = (command, inputTokens, constants) => {
  for (let i = 0; i < command.patterns.length; i++) { // for each pattern
    const patternTokens = command.patterns[i].tokens;
    if (patternTokens.length === inputTokens.length) {
      const args = {};
      let match = true;
      for (let j = 0; j < patternTokens.length; j++) { // for each token in pattern
        const patternToken = patternTokens[j];
        if (patternToken.isArg) {
          // checks whether the given token is a JSON object, if so inject it to args as an object
          // used in JARVIS handlers
          const constantArg = parseJson(inputTokens[j], constants);
          const parsedArg = constantArg ? constantArg : inputTokens[j];
          args[patternToken.value] = parsedArg;
        } else {
          if (inputTokens[j] !== patternToken.value) {
            match = false;
            break;
          }
        }
      }
      if (match)
        return { args };
    }
  }
  return null;
};

exports.parseInputTokens = parseInputTokens;

// checks tokens against the macro command
// returns args if match, else null
const parseMacroInputTokens = (macro, inputTokens) => {
  const patternTokens = macro.tokens;
  if (patternTokens.length === inputTokens.length) {
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
      return { args };
  }
  return null;
};
exports.parseMacroInputTokens = parseMacroInputTokens;

// change variable tokens to values of args
// returns same string if no variables found
const parseMacroSubCommand = (line, args) => {
  let tokens = parseCommand(line);
  let parsedLine = line;
  tokens.forEach((token) => {
    if (token.isArg) {
      if (args[token.value]) {
        parsedLine = parsedLine.replace(`$${token.value}`, `"${args[token.value]}"`);
      }
    }
  })

  return parsedLine;
};
exports.parseMacroSubCommand = parseMacroSubCommand;

// change constant tokens to corresponding values
// returns same string if no constant found
const parseConstants = (line, constants) => {
  let constantTokens = line.match(/\$[A-Z_][0-9A-Z_]*/g);
  let parsedLine = line;
  if (constantTokens) {
    constantTokens.forEach((token) => {
      const key = token.replace('$', '');
      const constantValue = constants[key];
      if (constantValue && (typeof constantValue === 'string')) {
        parsedLine = parsedLine.replace(token, `"${constants[key]}"`);
      }
    })
  }
  return parsedLine;
}
exports.parseConstants = parseConstants;

// returns string content by reading a script
const parseScript = filename => {
  let content;
  try {
    content = fs.readFileSync(filename, "utf8");
  } catch (error) {
    throw new Error('Could not read file from the specified location!');
  }
  const lines = content.split("\n");
  const filteredCommands = lines.filter(line => {
    return line !== "" && !line.trim().startsWith("#");
  });
  return filteredCommands;
};
exports.parseScript = parseScript;

// checks the validity of a provided script
const validateScript = (extension, file) => {
  if (path.extname(file) === `.${extension}`) {
    return true;
  }
};
exports.validateScript = validateScript;

// read and parse the JSON file
const importJson = (filename) => {
  let content;
  try {
    content = fs.readFileSync(filename, "utf8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error('Invalid JSON import!');
  }
}
exports.importJson = importJson;

// checks whether the given argument is referring to an JSON object
// if so returns the corresponding object, else returns null
const parseJson = (argument, constants) => {
  if (argument.startsWith('$')) {
    const key = argument.replace('$', '');
    const constantValue = constants[key];
    if (constantValue && typeof constantValue === 'object') {
      return constantValue;
    }
  }
  return null;
}