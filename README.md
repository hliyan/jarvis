# J.A.R.V.I.S - Just Another Rudimentary Verbal Interface Shell

![build](https://travis-ci.org/hliyan/jarvis.svg?branch=master) 
[![Coverage Status](https://coveralls.io/repos/github/hliyan/jarvis/badge.svg?branch=master)](https://coveralls.io/github/hliyan/jarvis?branch=master)

## Introduction

JARVIS helps you write rudimentary English wrappers around libraries or APIs, like this:

```javascript
// wrap you JavaScript function with an English API:
jarvis.addCommand({
  command: '<number> to the power of <power>',
  handler: ({args: {number, power}}) => {
    const result = Math.pow(parseInt(number), parseInt(power));
    return `${number} to the power of ${power} is ${result}!`;
  }
});
```

Use it from an interactive command line prompt

```shell
> 2 to the power of 3
  2 to the power of 3 is 8!
```

## Installation

```
npm install --save hliyan/jarvis
```

## Basic example: wrapping an existing library

Invoke an API using natural language.

```javascript

const Jarvis = require('jarvis');            // use jarvis to
const IssueClient = require('issue-client'); // wrap this with a basic english API

const app = new Jarvis();
const client = new IssueClient();

// register command
app.addCommand({
  command: 'connectToRepository <repoName>',
  aliases: [
    'connect to <repoName>',
    'connect repo <repoName>',
    'connect to <repoName> repo'
  ],
  handler: async ({args: {repoName}}) => {
    const res = await client.connect(repoName);
    return res.success ? `Connected to ${repoName}.` : `Could not connect to ${repoName}. Here's the error: ${res.error}`;
  }
});

// exercise the command
const res = await app.send('connect to hliyan/jarvis');
console.log(res); // "Connected to hliyan/jarvis."
```

## Command line integration

Invoke an API using natural language, as a shell command.

```javascript
const FAQClient = require('./faq');   // business logic from here
const Jarvis = require('jarvis');     // wrapped by jarvis 
const readline = require('readline'); // and connected to a command line

const app = new Jarvis();
const client = new FAQClient();

// register the command
app.addCommand({
  command: 'getCountryPresident <country>',
  aliases: [
    'who is the president of <country>',
    '<country> president'
  ],
  handler: async ({args: {country}}) => {
    const president = await client.getPresident(country);
    return president ? `the president of ${country} is ${president}`
      : `i don't know ${country}`;
  }
});

// start the CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'jarvis> '
});

rl.prompt();

// feed CLI input to the app, and app output back to CLI
rl.on('line', async (line) => {
  const res = await app.send(line.trim());
  console.log(res ? `  ${res}` : '  I don\'t understand');
  rl.prompt();
});

// TODO: error handling and other best practices
```

Running:
```shell
$ node index.js
jarvis> who is the president of russia
  the president of russia is Vladamir Putin
jarvis> usa president
  the president of usa is Barack Obama
jarvis> us president
  i don't know us
jarvis> foo
  I don't understand
jarvis> 
```

* Full source: [hliyan/jarvis-sample-app](https://github.com/hliyan/jarvis-sample-app)

## Interactive CLI

Use this when the workflow you're trying to wrap is too complicated to execute as a single line command.

You can enter an interactive command session using `jarvis.startCommand(<name>)` and exit that particular session using `jarvis.endCommand()`. State that needs to be maintained for the duration of the interactive session can be set using `jarvis.setCommandState(<object>)`.

```javascript
  const jarvis = new Jarvis();
  jarvis.addCommand({
    command: 'repl',
    handler: ({context, line}) => {
      if (!context.activeCommand) {
        context.startCommand('repl');
        context.setCommandState({status: 'awaitInput'});
        return 'Enter input: ';
      }
  
      if (context.state.status === 'awaitInput') {
        const out = 'Handled: ' + line;
        return out;
      }
    }
  });
```

Expected output
```
$ repl
$ Enter input:
$ bar
$ Handled: bar
$ ..  # built in exit
$ Done with repl.
```

## Script mode (TBD)

You can use this to run your natural language commands as a script.

Create a script file, e.g.

```
connect to repo 'hliyan/jarvis'
get open issues
write issues to 'home/john/issues.json'
```

Create a script runner with the correct bindings

```
const Jarvis = require('jarvis');
const app = new Jarvis();

// bind commands as described earlier

// run script
app.run('test.jarvis', function(input, output) {
  console.log(input);
  console.log(output);
});

```

## Constants (TBD)

```
in this context
  HOME is 'https://foo.bar.com'
  USER is 'john'
```

## Macros and variables (TBD)

You can use this to re-use blocks of commands within a script.

```
in this context
  PI is 3.14

how to get area of circle with radius <radius>
  # more statements here
end
```



