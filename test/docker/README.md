## Experimental test on docker
### Layers of the testing image

| Name of image | Description      |
|---------------|------------------|
| testing image of this project |   |
| [minoruta/pjsip-node-alpine](https://github.com/minoruta/pjsip-node-alpine) | pjsip libraries |
| [minoruta/node-alpine](https://github.com/minoruta/node-alpine) | nodejs |
| [alpine](https://alpinelinux.org) | alpine linux |

### Test
- open a terminal as #1
    - `docker-compose up [--build]`
- open a terminal as #2
    - `docker exec -it docker_pjsua_1 ash`
    - `cd pjsua.node`
    - `npm install`
    - `npm test`
