import React, { useState, useEffect } from "react";
import "./Home.css";
import Modal from "react-modal";
import { Auth, Amplify } from "aws-amplify";
import awsconfig from "../aws-exports";
import { DynamoDB } from "aws-sdk";
import AWS from "aws-sdk";

Amplify.configure(awsconfig);
AWS.config.update({
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  region: process.env.REACT_APP_AWS_REGION,
});
const dynamoDb = new DynamoDB.DocumentClient();

const Home = ({ currentUser }) => {
  const [tasks, setTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [estimatedCompletionTime, setEstimatedCompletionTime] = useState("");
  const [currentTask, setCurrentTask] = useState(null);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    fetchTasks();
    Auth.currentAuthenticatedUser()
      .then((user) => {
        setUserRole(user.attributes["custom:role"]);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [currentUser]); // Listen for changes in currentUser

  const fetchTasks = async () => {
    const params = {
      TableName: "Tasks-dev",
      FilterExpression: "#status = :status_val",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status_val": "OPEN",
      },
    };

    dynamoDb.scan(params, function (err, data) {
      if (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
      } else {
        console.log("Query succeeded.");
        setTasks(data.Items);
      }
    });
  };

  const handleOpenModal = (task) => {
    setCurrentTask(task);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const updateTaskCompletionDate = async () => {
    const params = {
      TableName: "Tasks-dev",
      Key: {
        id: currentTask.id,
      },
      UpdateExpression:
        "set estimatedCompletion = :e, assignedToId = :aid, assignedToName = :an, #status = :s",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":e": estimatedCompletionTime,
        ":aid": currentUser.attributes.sub,
        ":an": currentUser.attributes.name,
        ":s": "IN_PROGRESS",
      },
      ReturnValues: "UPDATED_NEW",
    };

    try {
      const data = await dynamoDb.update(params).promise();
      console.log(data);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitEstimate = () => {
    updateTaskCompletionDate();
    console.log(
      `Submitted estimated completion time for task ${currentTask.id}: ${estimatedCompletionTime}`
    );
    setShowModal(false);
    fetchTasks(); // Fetch the tasks again
  };

  return (
    <div className="container">
      <div className="flex-row">
        <div className="flex-large">
          <h2>Available Tasks</h2>
          {tasks.map((task, index) => (
            <div key={task.id}>
              <h3>{task.title}</h3>
              <p>{task.description}</p>
              <p>{task.detail}</p>
              <p>
                Submitted By: {task.submittedByName} ({task.companyName})
              </p>
              {userRole === "Student" && (
                <button
                  className="submit-estimate-button"
                  onClick={() => handleOpenModal(task)}
                >
                  Accept
                </button>
              )}
            </div>
          ))}
          <Modal
            isOpen={showModal}
            onRequestClose={handleCloseModal}
            contentLabel="Estimated Completion Time Modal"
            className="modal-content"
          >
            <h2>Submission Estimate</h2>
            <input
              type="date"
              value={estimatedCompletionTime}
              onChange={(e) => setEstimatedCompletionTime(e.target.value)}
            />
            <button onClick={handleSubmitEstimate}>Submit</button>
            <button onClick={handleCloseModal}>Close</button>
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default Home;
