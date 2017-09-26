FROM ubuntu:14.04

RUN \
  sudo apt-get update \
  && sudo apt-get install -y wget \
  && wget -q -O- https://s3.amazonaws.com/download.fpcomplete.com/ubuntu/fpco.key | sudo apt-key add - \
  && echo 'deb http://download.fpcomplete.com/ubuntu/trusty stable main'|sudo tee /etc/apt/sources.list.d/fpco.list \
  && sudo apt-get update \
  && sudo apt-get install -y stack

ADD . /app

WORKDIR /app

ENTRYPOINT ["stack", "exec", "back-exe"]
