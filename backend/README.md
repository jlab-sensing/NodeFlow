# NodeFlow Backend API

## Introduction

The NodeFlow backend is built using the [FastAPI](https://fastapi.tiangolo.com/) factory app pattern. All modules revolve around the running FastAPI context.

## Authentication

The NodeFlow API handles users authentication using a [refresh token flow](https://cloudentity.com/developers/basics/oauth-grant-types/refresh-token-flow/). Users are given an access token to the API and a refresh token to designate access time. Currently, still under construction

The authentication module is located under `auth`



1. Start by cloning the repository to your local machine

2. Create a virtual environment and install requirements.txt using pip, see [this guide](https://github.com/pypa/packaging.python.org/blob/main/source/guides/installing-using-pip-and-virtual-environments.rst) for help

3. Once installed, run FastAPI in developer mode to view documents and calls.
```bash
#Runs FastAPI in developer mode
fastapi dev app/main.py --port 8001
```

4. To check if it is running, you can view at:
http://127.0.0.1:8001

5. To view all the interactive API docs, you can go to:
 http://127.0.0.1:8001/docs
