FROM ubuntu:18.04

RUN apt-get update && apt-get upgrade -y \
   && apt-get install -y wget npm nodejs imagemagick fluid-soundfont-gm fluid-soundfont-gs ghostscript netcat \
   && apt-get install -y libogg0 libvorbisenc2 libogg-dev libvorbis-dev gettext lltag\
   && apt-get install -y sox time\
   && apt-get autoremove \
   && apt-get autoclean

RUN wget http://lilypond.org/download/binaries/linux-64/lilypond-2.19.83-1.linux-64.sh \
    && bash lilypond-2.19.83-1.linux-64.sh --batch --prefix=/opt

RUN wget "https://sourceforge.net/projects/timidity/files/TiMidity%2B%2B/TiMidity%2B%2B-2.15.0/TiMidity%2B%2B-2.15.0.tar.gz/download" \
    && mv download download.tar.gz && tar -xvf download.tar.gz && cd TiMid* \
    && bash autogen.sh && ./configure --enable-audio=vorbis && make && make install

# RUN sed -i 's|<policy domain="coder" rights="none" pattern="PS" />|<policy domain="coder" rights="read\|write" pattern="PS" />|g' /etc/ImageMagick-6/policy.xml

RUN cp -R /opt/lilypond/usr/share/* /usr/share/
RUN cp -R /opt/lilypond/usr/bin/* /usr/bin/
RUN cp -R /opt/lilypond/usr/etc/* /etc/
RUN cp -R /opt/lilypond/usr/lib/* /lib/

RUN sed -i '/-dBATCH/a "-dNumRenderingThreads=1"' /usr/share/lilypond/current/scm/ps-to-png.scm \
    && sed -i '/-dBATCH/a "-dUseCropBox"' /usr/share/lilypond/current/scm/ps-to-png.scm \
    && sed -i 's/AlphaBits=4/AlphaBits=4/g' /usr/share/lilypond/current/scm/ps-to-png.scm \
    && sed -i 's/-r1200/-r1200/g' /usr/share/lilypond/current/scm/backend-library.scm

COPY ./docker_res/timidity.cfg /etc/timidity/timidity.cfg
COPY ./docker_res/timidity.cfg /usr/local/share/timidity/timidity.cfg
COPY ./docker_res/ /opt/res/

COPY ./package.json /opt/app/package.json
RUN cd /opt/app && npm install --only=production
COPY ./ /opt/app/
RUN mkdir -p /opt/app/tmpgen && chmod 0777 /opt/app/tmpgen
RUN cd /opt/app/static; export DATE=`date +%s`; cat serviceworker-raw.js | envsubst > serviceworker.js

# DEBUG TIME!
RUN apt-get install -y strace vim 

CMD ["bash", "/opt/app/startapp.sh"]
