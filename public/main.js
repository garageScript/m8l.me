const routeInput = document.querySelector(".routeInput");
const routeSubmit = document.querySelector(".routeSubmit");
const routeResult = document.querySelector(".routeResult");

let correctData;

const submitRoute = () => {
  const route = routeInput.value;
  if (!route.length) {
    return;
  }
  fetch(`/api/routes`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      url: route,
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      correctData = data;
      routeResult.innerHTML = `
    <blockquote>
      <p>
      <span class="label">MX: </span> ${data.mx}
      </p>
      <p>
      <span class="label">TXT: </span> ${data.id}
      </p>
    </blockquote>
  <p>
  Put the above MX and TXT records for your domain. You could do this in the place you bought your domain name
  in step 1.
  </p>
  <p>
  If you are asked to put in a host field, the standard value is @
  </p>
  <p>
  Domain name records can take 1 - 600 minutes to propagate. 
  Check the MX and TXT record in step 1 and wait until everything successful.
  </p>
      `;
    });
};

const keySubmitContainer = (cb) => {
  return (e) => {
    if (e.key === "Enter") {
      return cb();
    }
  };
};

routeInput.addEventListener("keyup", keySubmitContainer(submitRoute));
routeSubmit.addEventListener("click", submitRoute);

/*
 * next section: url
app.get("/url/:name", async (req, res) => {
 */
const domainInput = document.querySelector(".domainInput");
const domainSubmit = document.querySelector(".domainSubmit");

const domainResult = document.querySelector(".domainResult");

const evaluateMX = (mx) => {
  if (mx === "mx.m8l.me.") {
    return {
      class: "success",
      message: "All set!",
    };
  }
  return {
    class: "error",
    message: "Does not match mx.m8l.me.",
  };
};

const evaluateTxt = (txt, expected) => {
  if (expected) {
    return {
      class: "success",
      message: "Txt record matches our format",
    };
  }
  return {
    class: "error",
    message: "Does not match our TXT Format",
  };
};

const checkUrl = () => {
  const url = domainInput.value;
  if (!url.length) {
    return;
  }

  fetch(`/url/${url}`)
    .then((r) => r.json())
    .then((data) => {
      const mxLines = data.mxLines.reduce((acc, e) => {
        const parts = e.split(" ");
        const mx = parts[parts.length - 1];
        const evaluation = evaluateMX(mx);
        return (
          acc +
          `<p class="${evaluation.class}">
          <span class="label">MX: </span>
          ${mx}
          <span class="explanation">
          (${evaluation.message})
          </span>
          </p>`
        );
      }, "");
      const mxTxt = data.txtLines.reduce((acc, e) => {
        const parts = e.split(" ");
        const txt = parts[parts.length - 1];
        const evaluation = evaluateTxt(txt, data.goodTxt);
        return (
          acc +
          `<p class="${evaluation.class}">
          <span class="label">TXT: </span>
          ${txt}
          <span class="explanation">
          (${evaluation.message})
          </span>
          </p>`
        );
      }, "");
      domainResult.innerHTML = `
    <blockquote>
    ${mxLines}

    ${mxTxt}
    </blockquote>
      `;
    });
};
domainInput.addEventListener("keyup", keySubmitContainer(checkUrl));
domainSubmit.addEventListener("click", checkUrl);
