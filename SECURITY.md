# Security policy

## Reporting

Do not open a public issue containing a credential, private homelab address, or exploitable learner deployment detail. Report it privately to the repository owner and rotate any exposed credential before discussing the fix.

## Course-site boundary

GitHub Pages serves only the generated static site. It does not receive learner tokens, application secrets, or homelab credentials. Browser-local progress may contain public evidence links and short notes; it must not contain secrets or customer data.

## Build-tool advisory exception

VitePress 1.6.4 currently resolves a Vite 5 development server with known path-disclosure advisories and no compatible patched VitePress 1.x dependency. The generated static output is not affected.

Until a compatible VitePress release is available:

- run `vitepress dev` only on the default loopback address
- never expose the development server to a shared or untrusted network
- treat lesson Markdown and theme code from pull requests as untrusted build input
- keep CI isolated from production credentials
- fail CI on critical npm advisories and review the documented Vite/VitePress exception on dependency updates

Remove this exception and restore a high-severity audit gate as soon as VitePress ships a compatible fix.
