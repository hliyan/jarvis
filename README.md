# J.A.R.V.I.S - Just Another Rudimentary Verbal Interface Shell

* JARVIS helps you write rudimentary English wrappers around libraries or APIs
* For an example, see: [hliyan/jarvis-sample-app](https://github.com/hliyan/jarvis-sample-app)

# Example

```javascript

const Jarvis = require('jarvis');
const IssueClient = require('issue-client'); // assume you already have this

const app = new Jarvis();
const client = new IssueClient();

app.addCommand({
  command: 'connectToRepository <repoName>',
  aliases: [
    'connect to <repoName>',
    'president of <country>', 
    '<country> president'
  ],
  handler: async ({args: {repoName}}) => {
    const res = await client.connect(repoName);
    return res.success ? `Connected to ${repoName}.` : `Could not connect to ${repoName}. Here's the error: ${res.error}`;
  }
});

const res = await app.send('connect to hliyan/jarvis');
console.log(res); // "Connected to hliyan/jarvis."
```
