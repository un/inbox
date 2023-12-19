//@ts-check

// This will be available in the browser
/** @type {import("@simplewebauthn/browser")} */
let SimpleWebAuthnBrowser

/** @typedef {import("./types").PasskeyOptionsAction} PasskeyOptionsAction */
/**
 * @template {PasskeyOptionsAction} T
 * @typedef {import("./types").PasskeyOptionsReturn<T>} PasskeyOptionsReturn
 */

/**
 * passkeyScript is the client-side script that handles the passkey form
 * 
 * @param {string} baseURL is the base URL of the auth API
 */
export async function passkeyScript(baseURL) {
  const startAuthentication = SimpleWebAuthnBrowser.startAuthentication
  const startRegistration = SimpleWebAuthnBrowser.startRegistration

  /**
   * Fetch passkey options from the server
   * 
   * @template {PasskeyOptionsAction} T
   * @param {T | undefined} action action to fetch options for
   * @param {string | undefined} email optional user email to fetch options for
   * @returns {Promise<PasskeyOptionsReturn<T> | undefined>}
   */
  async function fetchOptions(action, email) {
    // Create the options URL with the action and email query parameters
    const url = new URL(`${baseURL}/options`)

    if (action) url.searchParams.append("action", action)
    if (email) url.searchParams.append("email", email)

    const res = await fetch(url)
    if (!res.ok) {
      console.error("Failed to fetch options", res)

      return
    }

    return res.json()
  }

  /**
   * Get the passkey form from the page
   * 
   * @returns {HTMLFormElement}
   */
  function getForm() {
    /** @type {HTMLFormElement | null} */
    const form = document.querySelector("#passkey-form")
    if (!form) throw new Error("Form not found")

    return form
  }

  /**
   * Passkey form submission handler.
   * Takes the input from the form and a few other parameters and submits it to the server.
   * 
   * @template {"GET" | "POST"} T
   * @param {T} method http method to use
   * @param {PasskeyOptionsAction} action action to submit
   * @param {unknown | undefined} data optional data to submit
   * @returns {Promise<T extends "GET" ? Response : void>}
   */
  async function submitForm(method, action, data) {
    const form = getForm()
    console.log("SUBMITTING FORM", {form, method, action, data})
    
    if (method === "GET") {
      // If GET request, append action and data to URL as query parameters
      const formData = new FormData(form)
      const url = new URL(form.action)
      formData.append("action", action)

      // Add form data to URL
      for (const [key, value] of formData.entries()) {
        if (typeof value !== "string") continue
        url.searchParams.append(key, value)
      }

      if (data) {
        // Add data to URL
        url.searchParams.append("data", JSON.stringify(data))
      }

      /** @type {any} If this was a typescript file, we could use function overload to make the return value conditional, and avoid casting any here */
      const res = await fetch(url)
      return res
    }

    // If a POST request, create hidden fields in the form
    // and submit it so the browser redirects on login
    if (action) {
      const actionInput = document.createElement("input")
      actionInput.type = "hidden"
      actionInput.name = "action"
      actionInput.value = action
      form.appendChild(actionInput)
    }

    if (data) {
      const dataInput = document.createElement("input")
      dataInput.type = "hidden"
      dataInput.name = "data"
      dataInput.value = JSON.stringify(data)
      form.appendChild(dataInput)
    }

    /** @type {any} If this was a typescript file, we could use function overload to make the return value conditional, and avoid casting any, here */
    const v = form.submit()
    return v
  }

  /**
   * Executes the authentication flow by fetching options from the server,
   * starting the authentication, and submitting the response to the server.
   * 
   * @param {PasskeyOptionsReturn<"authenticate">['options']} options
   * @param {boolean} autofill Whether or not to use the browser's autofill
   * @returns {Promise<void>}
   */
  async function authenticationFlow(options, autofill) {
    // Start authentication
    const authResp = await startAuthentication(options, autofill)

    // Submit authentication response to server
    return await submitForm("POST", "authenticate", authResp)
  }

  /**
   * @param {PasskeyOptionsReturn<"register">['options']} options
   */
  async function registrationFlow(options) {
    // Get email from form
    const form = getForm()
    /** @type {string | undefined} */
    const email = form.email ? form.email.value : undefined
    if (!email) throw new Error("Register email not provided")

    // Start registration
    const regResp = await startRegistration(options)

    // Submit registration response to server
    return await submitForm("POST", "register", regResp)
  }

  /**
   * Attempts to authenticate the user when the page loads
   * using the browser's autofill popup.
   * 
   * @returns {Promise<void>}
   */
  async function autofillAuthentication() {
    // if the browser can't handle autofill, don't try
    if (!SimpleWebAuthnBrowser.browserSupportsWebAuthnAutofill()) return

    const res = await fetchOptions("authenticate", undefined)
    if (!res) {
      console.error("Failed to fetch option for autofill authentication")

      return
    }

    try {
      await authenticationFlow(res.options, true)
    } catch (e) {
      console.error(e)
    }
  }

  /**
   * Sets up the passkey form by overriding the form submission handler
   * so that it attempts to authenticate the user when the form is submitted.
   * If the user is not registered, it will attempt to register them instead.
   */
  async function setupForm() {
    const form = getForm()

    // If the browser can't do WebAuthn, hide the form
    if (!SimpleWebAuthnBrowser.browserSupportsWebAuthn()) {
      form.style.display = "none"

      return
    }

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault()

        // Fetch options from the server without assuming that
        // the user is registered
        const res = await fetchOptions(undefined, form.email.value)
        if (!res) {
          console.error("Failed to fetch options for form submission")

          return
        }

        // Then execute the appropriate flow
        if (res.action === "authenticate") {
          try {
            await authenticationFlow(res.options, false)
          } catch (e) {
            console.error(e)
          }
        } else if (res.action === "register") {
          try {
            await registrationFlow(res.options)
          } catch (e) {
            console.error(e)
          }
        }
      })
    }
  }

  // On page load, setup the form and attempt to authenticate the user.
  setupForm()
  autofillAuthentication()
}
