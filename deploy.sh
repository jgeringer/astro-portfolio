#!/bin/bash
set -e

cd ~/sites/astro-portfolio

git pull
pnpm build

docker build -t joegeringer-site .

docker stop joegeringer-site || true
docker rm joegeringer-site || true

docker run -d \
  --name joegeringer-site \
  --restart unless-stopped \
  -p 8091:80 \
  joegeringer-site