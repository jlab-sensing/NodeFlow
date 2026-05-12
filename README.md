# NodeFlow API 
Here is a document outlining the details of how to get my specific setup up and running on your end. 

1. Start by cloning the repository to your local machine or download main.py, schema.py and requirements.txt

2. For my setup, I did it inside of a virtual enviroment as that is what FastAPI reccomends.
```bash
# Create a virtual environment
python -m venv .venv
```
```bash
#Activate the enviroment (windows)
.venv\Scripts\activate
```
3. Next, install the FastAPI using the requirement.txt file provided to get the same setup I currently have running
```bash
#Installs FastAPI
pip install -r requirements.txt
```

4. Once you have all of this installed, you are ready to run it. FastAPI can be run in developer mode to view documents and calls.
```bash
#Runs FastAPI in developer mode
fastapi dev main.py
```

5. To check if it is running, you can view at:
http://127.0.0.1:8000

6. To view all the interactive API docs, you can go to:
 http://127.0.0.1:8000/docs