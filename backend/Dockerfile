#
# Base image
# 
# The base image contains the necessary dependencies to run the backend code.
# It installs the necessary apt packages and installs the python dependencies. A new
# user, "app", is created to run the code unprivileged.
FROM python:3.11-slim AS base

# set environment variables to have python print to stdout
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev

# install python dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
#RUN pip wheel --no-cache-dir --no-deps --wheel-dir /usr/src/app/wheels -r requirements.txt

# create new user and group to run the app with name "app"
WORKDIR /app

# copy files from source tree
COPY . .


# CI image with test-only dependencies and coverage reporting.
FROM base AS test

RUN pip install --no-cache-dir -r requirements-dev.txt

CMD ["pytest", "--cov=app", "--cov-report=term-missing", "--cov-report=xml:/app/coverage.xml"]


FROM base AS webserver

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
