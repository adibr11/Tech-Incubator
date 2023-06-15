import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Tasks.css";
import { Auth, Amplify } from "aws-amplify";
import awsconfig from "../aws-exports";
import { DynamoDB } from "aws-sdk";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import Modal from "react-modal";

Amplify.configure(awsconfig);
AWS.config.update({
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  region: process.env.REACT_APP_AWS_REGION,
});
const dynamoDb = new DynamoDB.DocumentClient();

const Tasks = ({ currentUser }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [details, setDetails] = useState("");
  const [taskList, setTaskList] = useState([]);
  const [acceptedTasks, setAcceptedTasks] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [userCompany, setUserCompany] = useState("");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [estimatedCompletionTime, setEstimatedCompletionTime] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [assignedToName, setAssignedToName] = useState("");
  const [taskCompletionURL, setTaskCompletionURL] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState({});
  const [completedTasks, setCompletedTasks] = useState([]);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      fetchTasks();
    }
  }, [userId]);

  const fetchTasks = async () => {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: "Tasks-dev",
      FilterExpression:
        "#submittedBy = :submittedBy_val AND #status <> :status_val AND #status <> :status_val2",
      ExpressionAttributeNames: {
        "#submittedBy": "submittedBy",
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":submittedBy_val": userId,
        ":status_val": "REMOVED",
        ":status_val2": "COMPLETE",
      },
    };

    docClient.scan(params, function (err, data) {
      if (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
      } else {
        console.log("Query succeeded.");
        setTaskList(data.Items);
      }
    });
  };

  const fetchAcceptedTasks = async () => {
    const params = {
      TableName: "Tasks-dev",
      FilterExpression:
        "#assignedToId = :assignedToId_val and #status = :status_val",
      ExpressionAttributeNames: {
        "#assignedToId": "assignedToId",
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":assignedToId_val": userId,
        ":status_val": "IN_PROGRESS",
      },
    };

    dynamoDb.scan(params, function (err, data) {
      if (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
      } else {
        console.log("Query succeeded.");
        setAcceptedTasks(data.Items);
      }
    });
  };

  useEffect(() => {
    if (userId) {
      fetchTasks();
      fetchAcceptedTasks();
      fetchCompletedTasks();
    }
  }, [userId]);

  const fetchCompletedTasks = async () => {
    const docClient = new AWS.DynamoDB.DocumentClient();
    let params;

    if (userRole === "Company") {
      params = {
        TableName: "Tasks-dev",
        FilterExpression:
          "#submittedBy = :submittedBy_val and #status = :status_val",
        ExpressionAttributeNames: {
          "#submittedBy": "submittedBy",
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":submittedBy_val": userId,
          ":status_val": "COMPLETE",
        },
      };
    } else if (userRole === "Student") {
      params = {
        TableName: "Tasks-dev",
        FilterExpression:
          "#assignedToId = :assignedToId_val and #status = :status_val",
        ExpressionAttributeNames: {
          "#assignedToId": "assignedToId",
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":assignedToId_val": userId,
          ":status_val": "COMPLETE",
        },
      };
    }

    docClient.scan(params, function (err, data) {
      if (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
      } else {
        console.log("Query succeeded.");
        setCompletedTasks(data.Items);
      }
    });
  };

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then((user) => {
        setUserRole(user.attributes["custom:role"]);
        setUserName(user.attributes.name);
        setUserId(user.attributes.sub);
        setUserCompany(user.attributes["custom:companyName"]);
      })
      .catch(() => {
        navigate("/login");
      });
  }, [navigate, currentUser]);

  const createNewTask = async () => {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const taskDetails = {
      TableName: "Tasks-dev",
      Item: {
        id: uuidv4(),
        title: title,
        description: description,
        detail: details,
        submittedBy: userId,
        companyName: userCompany,
        submittedByName: userName,
        status: "OPEN",
        estimatedCompletionTime: estimatedCompletionTime,
        assignedToId: assignedToId,
        assignedToName: assignedToName,
        taskCompletionURL: taskCompletionURL,
      },
    };

    docClient.put(taskDetails, (err, data) => {
      if (err) {
        console.error(
          "Unable to add item. Error JSON:",
          JSON.stringify(err, null, 2)
        );
      } else {
        console.log("Added item:", JSON.stringify(data, null, 2));
        // After task creation, clear the form or do whatever is necessary
        setTitle("");
        setDescription("");
        setDetails("");

        fetchTasks();
      }
    });
  };

  const removeTask = async (taskId) => {
    const params = {
      TableName: "Tasks-dev",
      Key: { id: taskId },
      UpdateExpression: "set #status = :s",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":s": "REMOVED",
      },
      ReturnValues: "UPDATED_NEW",
    };

    dynamoDb.update(params, function (err, data) {
      if (err) {
        console.error(
          "Unable to remove item. Error JSON:",
          JSON.stringify(err, null, 2)
        );
      } else {
        console.log("RemoveItem succeeded:", JSON.stringify(data, null, 2));
        fetchTasks();
      }
    });
  };

  const handleOpenCompletionModal = (task) => {
    setCurrentTask(task);
    setIsCompletionModalOpen(true);
  };

  const handleCloseCompletionModal = () => {
    setIsCompletionModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleCompleteTask = async () => {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: "Tasks-dev",
      Key: { id: currentTask.id },
      UpdateExpression: "set #status = :s, #url = :u",
      ExpressionAttributeNames: {
        "#status": "status",
        "#url": "taskCompletionURL",
      },
      ExpressionAttributeValues: {
        ":s": "COMPLETE",
        ":u": taskCompletionURL,
      },
      ReturnValues: "UPDATED_NEW",
    };

    docClient.update(params, function (err, data) {
      if (err) {
        console.error(
          "Unable to update item. Error JSON:",
          JSON.stringify(err, null, 2)
        );
      } else {
        console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
        fetchTasks();
        fetchAcceptedTasks();
        fetchCompletedTasks();
        setTaskCompletionURL("");
        setIsCompletionModalOpen(false);
      }
    });
  };

  const completionModal = (
    <Modal
      isOpen={isCompletionModalOpen}
      onRequestClose={handleCloseCompletionModal}
    >
      <h2>Complete Task</h2>
      <label>Task Completion URL: </label>
      <input
        type="text"
        value={taskCompletionURL}
        onChange={(e) => setTaskCompletionURL(e.target.value)}
      />
      <button onClick={() => handleCompleteTask()}>Submit</button>
      <button onClick={handleCloseCompletionModal}>Close</button>
    </Modal>
  );
  return (
    <React.Fragment>
      {completionModal}
      <div className="tasksPage">
        <div className="left">
          <div className="userTasks">
            {userRole === "Company" && (
              <div>
                <h2>Created Tasks:</h2>
                {taskList.map((task) => {
                  return (
                    <div className="task">
                      <div className="showtask">
                        <div className="taskHeader">
                          <h3>{task.title}</h3>
                        </div>
                        <div className="taskContainer">
                          <div className="taskDescription">
                            <p>{task.description}</p>
                          </div>
                          <div className="taskBody">
                            <p>{task.detail}</p>
                          </div>
                        </div>
                        <div className="submission">
                          <p className="submittedBy">
                            Submitted By: {task.submittedByName} (
                            {task.companyName})
                          </p>
                          {task.assignedToId && (
                            <p>Assigned To: {task.assignedToName}</p>
                          )}
                          <div className="deleteTask">
                            <button onClick={() => removeTask(task.id)}>
                              &#128465;
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {userRole === "Student" && (
            <div className="Accepted-Tasks">
              <h2>Accepted Tasks:</h2>
              {acceptedTasks.map((task) => {
                return (
                  <div className="task">
                    <div className="showtask">
                      <div className="taskHeader">
                        <h3>{task.title}</h3>
                      </div>
                      <div className="taskContainer">
                        <div className="taskDescription">
                          <p>{task.description}</p>
                        </div>
                        <div className="taskBody">
                          <p>{task.detail}</p>
                        </div>
                      </div>
                      <div className="submission">
                        <p className="submittedBy">
                          Submitted By: {task.submittedByName} (
                          {task.companyName})
                        </p>
                      </div>
                      <div className="completeTask">
                        <button onClick={() => handleOpenCompletionModal(task)}>
                          Complete Task
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {userRole === "Company" && (
          <div className="tasksContainer">
            <h1> Create a Task </h1>
            <div className="inputGroup">
              <label> Title: </label>
              <input
                placeholder="Task Title..."
                className="taskField"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
              />
            </div>

            <div className="inputGroup">
              <label> Description: </label>
              <input
                className="taskField"
                placeholder="Task Description..."
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                }}
              />
            </div>
            <div className="inputGroup">
              <label> Task: </label>
              <textarea
                className="taskField"
                placeholder="Task Details..."
                value={details}
                onChange={(event) => {
                  setDetails(event.target.value);
                }}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={createNewTask}
            >
              Submit New Task
            </button>
          </div>
        )}
        {userRole === "Company" && (
          <div className="Completed-Tasks">
            <h2>Completed Tasks:</h2>
            {completedTasks.map((task) => {
              return (
                <div className="task">
                  <div className="showtask">
                    <div className="taskHeader">
                      <h3>{task.title}</h3>
                    </div>
                    <div className="taskContainer">
                      <div className="taskDescription">
                        <p>{task.description}</p>
                      </div>
                      <div className="taskBody">
                        <p>{task.detail}</p>
                      </div>
                    </div>
                    <div className="submission">
                      <p className="submittedBy">
                        Submitted By: {task.submittedByName} ({task.companyName}
                        )
                        {task.assignedToId && (
                          <p>Completed By: {task.assignedToName}</p>
                        )}
                        <p>Task Completion URL: {task.taskCompletionURL}</p>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {userRole === "Student" && (
          <div className="Completed-Tasks">
            <h2>Completed Tasks:</h2>
            {completedTasks.map((task) => {
              return (
                <div className="task">
                  <div className="showtask">
                    <div className="taskHeader">
                      <h3>{task.title}</h3>
                    </div>
                    <div className="taskContainer">
                      <div className="taskDescription">
                        <p>{task.description}</p>
                      </div>
                      <div className="taskBody">
                        <p>{task.detail}</p>
                      </div>
                    </div>
                    <div className="submission">
                      <p className="submittedBy">
                        Submitted By: {task.submittedByName} ({task.companyName}
                        )
                      </p>
                      <p>Task Completion URL: {task.taskCompletionURL}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onRequestClose={handleCloseModal}>
        <h2>Task Details</h2>
        <p>Title: {currentTask.title}</p>
        <p>Description: {currentTask.description}</p>
        <p>Details: {currentTask.detail}</p>
        <button onClick={handleCloseModal}>Close</button>
      </Modal>
    </React.Fragment>
  );
};

export default Tasks;
