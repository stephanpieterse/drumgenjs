FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get upgrade -y \
   && apt-get install -y wget npm nodejs lilypond ghostscript netcat fluid-soundfont-gm fluid-soundfont-gs \
   && apt-get install -y libogg0 libvorbisenc2 libogg-dev libvorbis-dev gettext lltag\
   && apt-get install -y sox time\
   && wget "https://sourceforge.net/projects/timidity/files/TiMidity%2B%2B/TiMidity%2B%2B-2.15.0/TiMidity%2B%2B-2.15.0.tar.gz/download" \
   && mv download download.tar.gz && tar -xvf download.tar.gz && cd TiMid* \
   && bash autogen.sh && ./configure --enable-audio=vorbis && make && make install \
   && cd .. && rm download.tar.gz \
   && apt-get autoclean

RUN apt-get update && apt-get install -y vim git vorbis-tools

COPY ./docker_res/ps-to-png.scm /usr/share/lilypond/current/scm/ps-to-png.scm
COPY ./docker_res/timidity.cfg /etc/timidity/timidity.cfg
COPY ./docker_res/timidity.cfg /usr/local/share/timidity/timidity.cfg
COPY ./docker_res/ /opt/res/

RUN useradd -u 1000 -ms /bin/bash appuser
RUN mkdir /opt/app && chown -R appuser /opt/app
USER appuser
WORKDIR /opt/app
COPY ./package.json /opt/app/package.json
#RUN cd /opt/app && npm install --only=production
RUN cd /opt/app && npm install
COPY --chown=appuser:appuser ./ /opt/app/
RUN cd /opt/app/static; export DATE=`date +%s`; cat serviceworker-raw.js | envsubst > serviceworker.js

RUN mkdir -p /opt/app/tmpgen && chmod 0777 /opt/app/tmpgen
CMD ["bash", "/opt/app/startapp.sh"]
