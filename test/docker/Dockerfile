ARG VERSION_PJSIP=latest
FROM minoruta/pjsip-node-alpine:$VERSION_PJSIP
MAINTAINER KINOSHITA minoru <5021543+minoruta@users.noreply.github.com>

WORKDIR /root
RUN apk add --no-cache --virtual .build4pjsua \
    asterisk \
    python \
    pkgconf \
    alpine-sdk \
&&  npm install -g node-gyp

CMD cd /root/pjsua.node \
&&  npm install \
&&  asterisk -c > /dev/null
