# RFCs for implementing NFS

## Core NFSv4.1 / 4.2

| RFC | Title | Link |
|-----|-------|------|
| RFC 8881 | Network File System (NFS) Version 4 Minor Version 1 Protocol (obsoletes RFC 5661) | https://www.rfc-editor.org/rfc/rfc8881.html |
| RFC 5662 | NFSv4 Minor Version 1 External Data Representation Standard (XDR) Description | https://www.rfc-editor.org/rfc/rfc5662.html |
| RFC 7862 | Network File System (NFS) Version 4 Minor Version 2 Protocol | https://www.rfc-editor.org/rfc/rfc7862.html |
| RFC 7863 | NFSv4 Minor Version 2 External Data Representation Standard (XDR) Description | https://www.rfc-editor.org/rfc/rfc7863.html |

## RPC / transport layer

| RFC | Title | Link |
|-----|-------|------|
| RFC 5531 | RPC: Remote Procedure Call Protocol Specification Version 2 | https://www.rfc-editor.org/rfc/rfc5531.html |
| RFC 4506 | XDR: External Data Representation Standard | https://www.rfc-editor.org/rfc/rfc4506.html |
| RFC 2203 | RPCSEC_GSS Protocol Specification (only for Kerberos auth) | https://www.rfc-editor.org/rfc/rfc2203.html |

## Other NFS versions (reference)

| RFC | Title | Link |
|-----|-------|------|
| RFC 7530 | Network File System (NFS) Version 4 Protocol (NFSv4.0) | https://www.rfc-editor.org/rfc/rfc7530.html |
| RFC 7531 | NFSv4.0 External Data Representation Standard (XDR) Description | https://www.rfc-editor.org/rfc/rfc7531.html |
| RFC 1813 | NFS Version 3 Protocol Specification | https://www.rfc-editor.org/rfc/rfc1813.html |

## Suggested reading order

1. RFC 5531 + RFC 4506: RPC and XDR wire format (`rpc.js`)
2. RFC 8881 §2: core concepts (client IDs, sessions, stateids)
3. RFC 8881 §16: NULL and COMPOUND procedures
4. RFC 8881 §18: individual operations (`ops/`)
5. RFC 8881 §15: error codes (`nfs-errors.js`)
6. RFC 5662: exact type definitions (`nfs-types.js`)
