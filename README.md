# J.A.R.V.I.S - Just Another Rudimentary Verbal Interface Shell

![build](https://travis-ci.org/hliyan/jarvis.svg?branch=master)

* JARVIS helps you write rudimentary English wrappers around libraries or APIs

# Basic example

```javascript

const Jarvis = require('jarvis');
const IssueClient = require('issue-client'); // assume you already have this

const app = new Jarvis();
const client = new IssueClient();

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

const res = await app.send('connect to hliyan/jarvis');
console.log(res); // "Connected to hliyan/jarvis."
```

# Example integrated with a command line

* See: [hliyan/jarvis-sample-app](https://github.com/hliyan/jarvis-sample-app)
