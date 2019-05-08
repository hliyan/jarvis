const { 
  parseCommand, 
  tokenize, 
  parseInputTokens,
  parseCommandInMacro 
} = require("../src/utils");

describe('tokenize', () => {
  
  test('double quoted strings', () => {
    expect(tokenize('hello world "Hello World"'))
      .toEqual(['hello', 'world', 'Hello World']);
  });

  test('double quoted strings with punctuation', () => {
    expect(tokenize('hello world "Hello, World"'))
      .toEqual(['hello', 'world', 'Hello, World']);
  });

  // TODO
  test('double quoted strings with escaped double quotes', () => {
    //expect(tokenize('hello world "Hello \"World\""'))
    //  .toEqual(['hello', 'world', 'Hello \"World\"']);
  });

});

describe('parseCommand', () => {
  
  test('basic command', () => {
    expect(parseCommand('hello $name'))
      .toEqual([
        {value: 'hello', isArg: false}, {value: 'name', isArg: true}
      ]);
  }); 

  test('basic command with infix', () => {
    expect(parseCommand('hello $name how are you'))
      .toEqual([
        {value: 'hello', isArg: false}, 
        {value: 'name', isArg: true},
        {value: 'how', isArg: false}, 
        {value: 'are', isArg: false}, 
        {value: 'you', isArg: false}
      ]);
  }); 
});

describe('parseCommandInMacro', () => {
  
  test('basic command', () => {
    expect(parseCommandInMacro('hello $name',{name: 'jhon doe'}))
      .toEqual('hello jhon doe');
  }); 

  test('basic command with two variables', () => {
    expect(parseCommandInMacro('hello $name , are you from $home ?',{name:'jhon snow',home:'winterfell'}))
      .toEqual('hello jhon snow , are you from winterfell ?');
  }); 
});