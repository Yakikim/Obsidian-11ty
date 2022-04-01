# How to publish the site on Docker

## Docker build 
from the main directory run:
```
docker build -t mysite .
```
## Docker run
From **PowerSell** cli run:
```
docker run -v ${pwd}:/app --name eleventizy -p 8080:8080 mysite
```


