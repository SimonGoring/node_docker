# Moving a Node.js App to AWS with Docker

I've been working with `node.js` as a tool to [rebuild the Neotoma Database's API](http://neotomadb/api_nodetest).  As part of that process we'd like to build a self-contained unit that can be used to do development locally, but also to serve the container on the remote server.

While I'm familiar with Docker and node, I haven't put the two together, so this is a first attempt at putting it all together to generate an app up on AWS.  I am following documentation on the [`node.js` website](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/).

## Setting up node.js and express

### Creating the package

The tutorial asks us to start with a `package.json` file, but I went with using `npm install` and then hand editing so that I got something like this:

```json
{
  "name": "node_docker",
  "version": "0.1.0",
  "description": "Trying out a simple node app with Docker.",
  "main": "server.js",
  "dependencies": {},
  "devDependencies": {},
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "Simon Goring",
  "license": "MIT"
}
```

Then to add the `express` dependency I used `npm install express --save` which resulted in this:

```json
{
  "name": "node_docker",
  "version": "0.1.0",
  "description": "Trying out a simple node app with Docker.",
  "main": "server.js",
  "dependencies": {
    "express": "^4.15.3"
  },
  "devDependencies": {},
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "Simon Goring",
  "license": "MIT"
}
```

So, this looks pretty close to what was in the `node.js` tutorial, the differences are the `name` and general descriptive tags.  I also don't have the `scripts` tag set up properly.  `npm start` automatically runs `server.js` when it runs, and I went in and deleted the `scripts:test` line.  I'll work on tests later, so for completeness I went and edited the `scripts` section.  So now we're at a `package.json` file that looks like this:

```json
{
  "name": "node_docker",
  "version": "0.1.0",
  "description": "Trying out a simple node app with Docker.",
  "main": "server.js",
  "dependencies": {
    "express": "^4.15.3"
  },
  "devDependencies": {},
  "scripts": {
    "start": "node server.js"
  },
  "author": "Simon Goring",
  "license": "MIT"
}
```

### Writing up the Server JavaScript

The basic app is in a file called `server.js` in the main directory.  I was reading some documentation that talks about keeping things out of the root directory.  In general I like this idea, I think that having all these files in the root directory makes things messy when you're looking at a GitHub repo, but that's maybe just me.

Regardless, I basically copied the `server.js` file from [the tutorial](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/) with some minor changes:

```js
'use strict';

const express = require('express');

// Constants
const PORT = 8080;

// App
const app = express();
app.get('/', function (req, res) {
  res.send('<h1>Hello world</h1>\nAnd a special hello to Simon!');
});

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);
```

A couple points about the code as it is.  (1) The use of `'use strict'` means that code is executed in as literal a manner as possible.  
  * Variables can only be created when declared.  Mis-typing a variable name doesn't create a new variable, it throws an error.
  * Assignments to properties that can't be overwritten throws an explicit error.
  * It prevents non-unique parameters.

There's good documentation on the [Mozilla Developer's strict mode page](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode).

### Running the Server code

The app only really prints out "Hello World" to the browser, and then logs "Running. . . " to the log.  We can test it out by running the same command that we used in our `scripts:start` element:

```bash
node server.js
```

(this works for me)

## Setting up Docker

Docker needs a `Dockerfile` from which to initialize the container.  Docker has good documentation on [`Dockerfile` best practices](https://docs.docker.com/engine/userguide/eng-image/dockerfile_best-practices/) that is worth reading.  We use the `FROM` argument to define the location of the `image` that we'll be using as the basis of our container:

```bash

# Define the docker hub image: https://hub.docker.com/_/node/
FROM node:alpine

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app

EXPOSE 8080
CMD [ "npm", "start" ]
```

So, we create a `Dockerfile` in our local directory and we'll use it to start our app.  When it starts it will download the node image, then in the container (which Docker creates) we create a `/usr/src/app` folder, which is where the source code for the app is going to go.

The `Dockerfile` then sets the `WORKDIR` to this folder, and moves the *local* `package.json` file from the current directory into the new `/usr/src/app/` folder.  Once that's done, in the `WORKDIR` it runs `npm install` to initialize the `node.js` application we've written above.

Once the application is initialized then we copy all the files in the current directory (`.`) into the `/usr/src/app` folder.  Given this, I would probably change some of these parameters around if we used a nested directory structure.

Finally, the `node.js` app, by default, is broadcast through port `8080`.  This means that we need to let `localhost:8080` broadacst to the pasten machine (ours).  Finally we us the `CMD` `npm start`, but it's concatenated.

The [Dockerfile Best practices](https://docs.docker.com/engine/userguide/eng-image/dockerfile_best-practices/) says we should also add a `.gitignore` file.  Here we'll put our node files:

```bash
node_modules
npm-debug.log
```

## The Moment of Truth

With the `Dockerfile` and the `.dockerignore` files create, the next thing to do is to *build* the Docker image.  We build the image and attach it to the system so that we can run it when we're ready.  So that we know where it is we need to give it an informative name, or *tag* using the `-t` parameter:

```bash
docker build -t simon/node_docker .
```

As this is happening you should see a whole bunch of output that looks something like this:

```
Sending build context to Docker daemon  11.78kB
Step 1/8 : FROM node:alpine
alpine: Pulling from library/node
79650cf9cc01: Pull complete 
2d271477e3b2: Pull complete 
49eae82ca692: Pull complete 
Digest: sha256:ec27361dcb1a1467f182c98e3e973123fda92580ef7b60b17166f550124a98a3
Status: Downloaded newer image for node:alpine
 ---> 2a7d8107cda5


Removing intermediate container 8f84cc1f9584
Successfully built 0cb6b0d27398
Successfully tagged simon/node_docker:latest
```

So this should mean that everything's been loaded into a container.  We can check to see if it's there using `docker image`.  You should see your image, with the tag, listed.

To run a docker image we need to use the command `docker run`.  This will tell Docker to set up the files as defined in the `Dockerfile`.  But there are some other things we need to do.  First, in the `Dockerfile` we expose a port (`8080`), so we need to bind that to a port on the parent machine using the `-p` flag (`-p 12345:8080`) so it says that to get to the `8080` port on the container we have to go in through our own `12345` port.  Then we want to add the name of the app project we're going to be running (`node_docker`)

```bash
docker run -p 12345:8080 -d simon/node_docker
```

Running this now gives you a long hash that is the long container ID.  You can copy this to a text file, or find your container ID and container status using [`docker ps`](https://docs.docker.com/engine/reference/commandline/ps/):

```bash
$ docker ps

CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS                     NAMES
a7c2debade1a        simon/node_docker   "npm start"         9 minutes ago       Up 8 minutes        0.0.0.0:12345->8080/tcp   loving_einstein
```

You can take the `CONTAINER ID` (in this case `a7c2debade1a`) and use it to  return the container logs as well:

```
$ docker logs a7c2debade1a

npm info it worked if it ends with ok
npm info using npm@4.2.0
npm info using node@v7.10.0
npm info lifecycle node_docker@0.1.0~prestart: node_docker@0.1.0
npm info lifecycle node_docker@0.1.0~start: node_docker@0.1.0

> node_docker@0.1.0 start /usr/src/app
> node server.js

Running on http://localhost:8080
```

### Testing the implementation

So, we've got the container running in the background, we know it's running well, now we want to actually test it.  In the `docker logs` we see that the Docker container tells us it's running on `localhost:8080`, but that's a trick.  It is running on `8080` within the container, but remember that in our `docker run` command above we assigned the container port (`8080`) to our host's port of `12345`.  So, we can either navigate to `http://localhost:12345`, or use `curl`:

```bash
curl -i localhost:49160
```

Using the `i` flag in this way gives us both the **Hello World** response defined above and the header information.