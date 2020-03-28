# build: docker build -t flashcards_dev_mongo:0.1 .
# run: docker container run --publish 27017:27017 --name flashcards_dev_mongo flashcards_dev_mongo:0.1
# start: docker start flashcards_dev_mongo
# stop: docker stop flashcards_dev_mongo

FROM mongo:3.6.17
VOLUME ./data/db /data/db
EXPOSE 27017