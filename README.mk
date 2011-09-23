Four Up 3D
----------

Four Up 3D is an online multiplayer implementation of 3D Connect Four:

http://en.wikipedia.org/wiki/Connect_Four

Implementation Details
----------------------

This project uses Three.js to render the game board in WebGL.  Socket.IO is used
to communicate between the web page and a Node.js server.  The server uses
Redis' publish and subscribe features to update connected sockets with game
updates.

Dependencies
------------

* WebGL capable browser and graphics card
  http://get.webgl.org/
* Node.js
  http://nodejs.org/
* NPM
  http://npmjs.org/
* Redis
  http://redis.io/

Running
-------

Use NPM to install dependencies:

    cd path/to/project
    npm install

Run with node:

    node src/app.js


Copyright 2011 Nick Ewing.
