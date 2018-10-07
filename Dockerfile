FROM ubuntu:16.04

RUN apt-get update && apt-get upgrade -y \
   && apt-get install -y lilypond npm nodejs timidity \
   && apt-get install -y imagemagick graphicsmagick fluid-soundfont-gm fluid-soundfont-gs ghostscript

COPY ./docker_res/timidity.cfg /etc/timidity/timidity.cfg

COPY ./ /opt/app/
COPY ./docker_res/ /opt/res/
#RUN cd /opt/app && npm install

CMD ["bash", "/opt/app/startapp.sh"]
