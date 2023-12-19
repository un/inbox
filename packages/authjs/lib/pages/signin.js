import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
const signinErrors = {
    default: "Unable to sign in.",
    signin: "Try signing in with a different account.",
    oauthsignin: "Try signing in with a different account.",
    oauthcallbackerror: "Try signing in with a different account.",
    oauthcreateaccount: "Try signing in with a different account.",
    emailcreateaccount: "Try signing in with a different account.",
    callback: "Try signing in with a different account.",
    oauthaccountnotlinked: "To confirm your identity, sign in with the same account you used originally.",
    emailsignin: "The e-mail could not be sent.",
    credentialssignin: "Sign in failed. Check the details you provided are correct.",
    sessionrequired: "Please sign in to access this page.",
};
function hexToRgba(hex, alpha = 1) {
    if (!hex) {
        return;
    }
    // Remove the "#" character if it's included
    hex = hex.replace(/^#/, "");
    // Expand 3-digit hex codes to their 6-digit equivalents
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    // Parse the hex value to separate R, G, and B components
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    // Ensure the alpha value is within the valid range [0, 1]
    alpha = Math.min(Math.max(alpha, 0), 1);
    // Construct the RGBA string
    const rgba = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    return rgba;
}
export default function SigninPage(props) {
    const { csrfToken, providers = [], callbackUrl, theme, email, error: errorType, } = props;
    if (typeof document !== "undefined" && theme.brandColor) {
        document.documentElement.style.setProperty("--brand-color", theme.brandColor);
    }
    if (typeof document !== "undefined" && theme.buttonText) {
        document.documentElement.style.setProperty("--button-text-color", theme.buttonText);
    }
    const error = errorType &&
        (signinErrors[errorType.toLowerCase()] ??
            signinErrors.default);
    const providerLogoPath = "https://authjs.dev/img/providers";
    return (_jsxs("div", { className: "signin", children: [theme.brandColor && (_jsx("style", { dangerouslySetInnerHTML: {
                    __html: `:root {--brand-color: ${theme.brandColor}}`,
                } })), theme.buttonText && (_jsx("style", { dangerouslySetInnerHTML: {
                    __html: `
        :root {
          --button-text-color: ${theme.buttonText}
        }
      `,
                } })), _jsxs("div", { className: "card", children: [error && (_jsx("div", { className: "error", children: _jsx("p", { children: error }) })), theme.logo && _jsx("img", { src: theme.logo, alt: "Logo", className: "logo" }), providers.map((provider, i) => {
                        let bg, text, logo, logoDark, bgDark, textDark;
                        if (provider.type === "oauth" || provider.type === "oidc") {
                            ;
                            ({
                                bg = "",
                                text = "",
                                logo = "",
                                bgDark = bg,
                                textDark = text,
                                logoDark = "",
                            } = provider.style ?? {});
                            logo = logo.startsWith("/") ? providerLogoPath + logo : logo;
                            logoDark = logoDark.startsWith("/")
                                ? providerLogoPath + logoDark
                                : logoDark || logo;
                            logoDark || (logoDark = logo);
                        }
                        return (_jsxs("div", { className: "provider", children: [provider.type === "oauth" || provider.type === "oidc" ? (_jsxs("form", { action: provider.signinUrl, method: "POST", children: [_jsx("input", { type: "hidden", name: "csrfToken", value: csrfToken }), callbackUrl && (_jsx("input", { type: "hidden", name: "callbackUrl", value: callbackUrl })), _jsxs("button", { type: "submit", className: "button", style: {
                                                "--provider-bg": bg,
                                                "--provider-dark-bg": bgDark,
                                                "--provider-color": text,
                                                "--provider-dark-color": textDark,
                                                "--provider-bg-hover": hexToRgba(bg, 0.8),
                                                "--provider-dark-bg-hover": hexToRgba(bgDark, 0.8),
                                            }, tabIndex: 0, children: [logo && (_jsx("img", { loading: "lazy", height: 24, width: 24, id: "provider-logo", src: logo })), logoDark && (_jsx("img", { loading: "lazy", height: 24, width: 24, id: "provider-logo-dark", src: logoDark })), _jsxs("span", { children: ["Sign in with ", provider.name] })] })] })) : null, ["email", "credentials", "passkey"].some((t) => provider.type === t) &&
                                    i + 1 < providers.length &&
                                    _jsx("hr", {}), provider.type === "email" && (_jsxs("form", { action: provider.signinUrl, method: "POST", children: [_jsx("input", { type: "hidden", name: "csrfToken", value: csrfToken }), _jsx("label", { className: "section-header", htmlFor: `input-email-for-${provider.id}-provider`, children: "Email" }), _jsx("input", { id: `input-email-for-${provider.id}-provider`, autoFocus: true, type: "email", name: "email", value: email, placeholder: "email@example.com", required: true }), _jsxs("button", { id: "submitButton", type: "submit", tabIndex: 0, children: ["Sign in with ", provider.name] })] })), provider.type === "credentials" && (_jsxs("form", { action: provider.callbackUrl, method: "POST", children: [_jsx("input", { type: "hidden", name: "csrfToken", value: csrfToken }), Object.keys(provider.credentials).map((credential) => {
                                            return (_jsxs("div", { children: [_jsx("label", { className: "section-header", htmlFor: `input-${credential}-for-${provider.id}-provider`, children: provider.credentials[credential].label ?? credential }), _jsx("input", { name: credential, id: `input-${credential}-for-${provider.id}-provider`, type: provider.credentials[credential].type ?? "text", placeholder: provider.credentials[credential].placeholder ?? "", ...provider.credentials[credential] })] }, `input-group-${provider.id}`));
                                        }), _jsxs("button", { id: "submitButton", type: "submit", tabIndex: 0, children: ["Sign in with ", provider.name] })] })), provider.type === "passkey" && (_jsxs("form", { id: "passkey-form", action: provider.callbackUrl, method: "POST", children: [_jsx("input", { type: "hidden", name: "csrfToken", value: csrfToken }), _jsx("label", { className: "section-header", htmlFor: `input-email-for-${provider.id}-provider`, children: "Email" }), _jsx("input", { id: `input-email-for-${provider.id}-provider`, autoFocus: true, type: "email", name: "email", autoComplete: "username webauthn", value: email, placeholder: "email@example.com", required: true }), _jsxs("button", { type: "submit", tabIndex: 0, children: ["Sign in with ", provider.name] })] })), ["email", "credentials", "passkey"].some((t) => provider.type === t) &&
                                    i + 1 < providers.length &&
                                    _jsx("hr", {})] }, provider.id));
                    })] })] }));
}
