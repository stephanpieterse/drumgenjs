FROM ubuntu:18.04

   #&& apt-get install -y lilypond npm nodejs timidity \
RUN apt-get update && apt-get upgrade -y \
   && apt-get install -y npm nodejs timidity \
   && apt-get install -y imagemagick graphicsmagick fluid-soundfont-gm fluid-soundfont-gs ghostscript \
   && apt-get install -y netcat


RUN apt-get install -y wget && wget http://lilypond.org/download/binaries/linux-64/lilypond-2.19.83-1.linux-64.sh \
    && bash lilypond-2.19.83-1.linux-64.sh --batch --prefix=/opt
RUN cp -R /opt/lilypond/usr/share/* /usr/share/
RUN cp -R /opt/lilypond/usr/bin/* /usr/bin/
RUN cp -R /opt/lilypond/usr/etc/* /etc/
RUN cp -R /opt/lilypond/usr/lib/* /lib/
COPY ./docker_res/timidity.cfg /etc/timidity/timidity.cfg

COPY ./ /opt/app/
COPY ./docker_res/ /opt/res/
#RUN cd /opt/app && npm install

CMD ["bash", "/opt/app/startapp.sh"]
