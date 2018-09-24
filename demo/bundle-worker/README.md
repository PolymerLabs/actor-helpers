# Bundle Worker

Modern browsers support ES modules in Workers. However, older browsers do not support this feature yet.
Therefore, we can generate a bundled build that uses https://github.com/GoogleChromeLabs/worker-plugin to bundle our worker.
To run this example, run the following commands:

  ```bash
  npm install
  npm run build
  ```
You can now run your favorite web server from the root directory `westend-helpers`.
Open http://127.0.0.1:8081/demo/bundle-worker/ to see the code working in modern browsers.
Open http://127.0.0.1:8081/demo/bundle-worker/build/ to see the code also working in older browsers.
