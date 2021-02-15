const nodeMailin = require("node-mailin");
const util = require("util");
const url = require("url");
const fetch = require("node-fetch");
const exec = util.promisify(require("child_process").exec);

/* Start the Node-Mailin server. The available options are:
 *  options = {
 *     port: 25,
 *     logFile: '/some/local/path',
 *     logLevel: 'warn', // One of silly, info, debug, warn, error
 *     smtpOptions: { // Set of options directly passed to simplesmtp.createServer(smtpOptions)
 *        SMTPBanner: 'Hi from a custom Node-Mailin instance',
 *        // By default, the DNS validation of the sender and recipient domains is disabled so.
 *        // You can enable it as follows:
 *        disableDNSValidation: false
 *     }
 *  };
 * parsed message. */
nodeMailin.start({
  port: 25,
  logLevel: "info",
});

/* Access simplesmtp server instance. */
nodeMailin.on("authorizeUser", function (connection, username, password, done) {
  if (username == "c0d3_admin" && password == "urjPyQdwzjzE5pCW") {
    done(null, true);
  } else {
    done(new Error("Unauthorized!"), false);
  }
});

/* Event emitted when the "From" address is received by the smtp server. */
nodeMailin.on("validateSender", async function (session, address, callback) {
  if (address == "foo@bar.com") {
    /*blacklist a specific email adress*/
    err = new Error("You are blocked"); /*Will be the SMTP server response*/
    err.responseCode = 530; /*Will be the SMTP server return code sent back to sender*/
    callback(err);
  } else {
    callback();
  }
});

/* Event emitted when the "To" address is received by the smtp server. */
nodeMailin.on("validateRecipient", async function (session, address, callback) {
  console.log(address);
  /* Here you can validate the address and return an error
   * if you want to reject it e.g:
   *     err = new Error('Email address not found on server');
   *     err.responseCode = 550;
   *     callback(err);*/
  callback();
});

/* Event emitted when a connection with the Node-Mailin smtp server is initiated. */
nodeMailin.on("startMessage", function (connection) {
  /* connection = {
      from: 'sender@somedomain.com',
      to: 'someaddress@yourdomain.com',
      id: 't84h5ugf',
      authentication: { username: null, authenticated: false, status: 'NORMAL' }
    }
  }; */
  console.log(connection);
});

/* Event emitted after a message was received and parsed. */
nodeMailin.on("message", async function (connection, data, content) {
  console.log("so awesome!!!");
  console.log(data);
  console.log(Object.keys(data));
  console.log("so awesome!!!");
  console.log("so awesome!!!");
  console.log("so awesome!!!");
  const domains = data.envelopeTo[0].address.split("@");

  const txtOut = await exec(
    `nslookup -type=TXT ${domains[domains.length - 1]}`
  );
  console.log("txtout", txtOut);

  const txtLines = txtOut.stdout
    .split("\n")
    .filter((e) => e.includes("text = "))
    .map((e) => e.replace(/\t/g, " ").replace(/\"/g, ""));

  const goodLine = txtLines
    .map((e) => {
      return e.split("text = ")[1];
    })
    .find((token) => {
      return mapping[token];
    });
  const routeInfo = mapping[goodLine];
  if (!routeInfo || !routeInfo.url) {
    return;
  }
  console.log("sending request to ", routeInfo.url);
  fetch(routeInfo.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(data),
  });

  /* Do something useful with the parsed message here.
   * Use parsed message `data` directly or use raw message `content`. */
});

nodeMailin.on("error", function (error) {
  console.log(error);
});

const fs = require("fs");
const https = require("https");
const privateKey = fs.readFileSync("/root/.acme.sh/m8l.me/m8l.me.key", "utf8");
const certificate = fs.readFileSync(
  "/root/.acme.sh/m8l.me/fullchain.cer",
  "utf8"
);
const credentials = { key: privateKey, cert: certificate };
const express = require("express");
const { nanoid } = require("nanoid");
const app = express();

const httpsServer = https.createServer(credentials, app);
app.use(express.json());

let mapping = {};
const mappingPath = "./mapping.db";

const createMapping = (url) => {
  const id = `C0D3${nanoid(32)}`;
  mapping[id] = {
    id,
    url,
    createdAt: Date.now(),
    validated: false,
    mx: "mx.m8l.me",
  };
  fs.writeFile(mappingPath, JSON.stringify(mapping, null, 2), () => {});
  return mapping[id];
};

app.use(express.static("public"));
app.post("/api/routes", (req, res) => {
  const record = createMapping(req.body.url);
  res.json(record);
});
app.get("/url/:name", async (req, res) => {
  const userUrl = getHostName(req.params.name);
  const [mxOut, txtOut] = await Promise.all([
    exec(`nslookup -type=mx ${userUrl}`),
    exec(`nslookup -type=TXT ${userUrl}`),
  ]);
  const mxLines = mxOut.stdout
    .split("\n")
    .filter((e) => e.includes("mail exchanger"))
    .map((e) => e.replace("\t", " "));

  const goodMX = !!mxLines.find((e) => e.includes("mx.m8l.me"));

  console.log(txtOut.stdout);
  const txtLines = txtOut.stdout
    .split("\n")
    .filter((e) => e.includes("text = "))
    .map((e) => e.replace(/\t/g, " ").replace(/\"/g, ""));

  const goodTxt = !!txtLines.find((e) => {
    const token = e.split("text = ")[1];
    console.log(token);
    console.log(mapping);
    return mapping[token];
  });
  res.json({
    mxLines,
    goodMX,
    txtLines,
    goodTxt,
  });
});

const FIVE_MINS = 50 * 60 * 1000;

const getHostName = (userInput) => {
  let trimmedInput = userInput.trim().toLowerCase();
  const prefix = trimmedInput.substr(0, 7);
  if (prefix !== "http://" && prefix !== "https:/") {
    trimmedInput = `https://${trimmedInput}`;
  }
  const urlObj = url.parse(trimmedInput);
  return urlObj.hostname;
};

const cleanJob = () => {
  console.log("mapping is", mapping);
  Object.entries(mapping).forEach(([key, val]) => {
    /*
    if (val.createdAt + FIVE_MINS < Date.now()) {
      console.log(`deleting route for ${val.url}`);
      delete mapping[key];
    }
    */
  });
  //fs.writeFile(mappingPath, JSON.stringify(mapping, null, 2), () => {});
  setTimeout(cleanJob, FIVE_MINS);
};

fs.readFile(mappingPath, (err, data) => {
  try {
    mapping = JSON.parse(data);
  } catch (e) {
    console.error("not good... could not parse mapping");
  }
  if (!mapping) {
    mapping = {};
  }
  cleanJob();
  httpsServer.listen(443, () => console.log("listening on port 443"));

  const httpApp = express();
  httpApp.get("/*", (req, res) => {
    const paramCheck = req.headers.host.split("?")[1];
    const params = paramCheck ? `?${paramCheck}` : "";
    res.redirect(`https://${req.headers.host}${req.path}${params}`);
  });
  httpApp.listen(80);
});
