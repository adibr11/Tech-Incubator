import React, { useState } from "react";
import { Auth, Amplify } from "aws-amplify";
import awsconfig from "../aws-exports";
import { DynamoDB } from "aws-sdk";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import { useNavigate, Router } from "react-router-dom";
import "./Signup.css";

Amplify.configure(awsconfig);
AWS.config.update({
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  region: process.env.REACT_APP_AWS_REGION,
});
const dynamoDb = new DynamoDB.DocumentClient();

const putUserToDynamoDB = async (userData) => {
  const params = {
    TableName: "Users-dev",
    Item: {
      id: uuidv4(),
      email: userData.email,
      name: userData.name,
      phoneNumber: userData.phone_number,
      role: userData["custom:role"],
      companyName: userData["custom:companyName"],
      logo: userData["custom:logo"],
      university: userData["custom:university"],
      skills: userData["custom:skills"],
    },
  };

  try {
    const data = await dynamoDb.put(params).promise();
    console.log("User added to DynamoDB:", data);
  } catch (error) {
    console.log("Error adding user to DynamoDB:", error);
  }
};

const CheckboxGroup = ({ setSelectedOption }) => {
  const [localSelectedOption, setLocalSelectedOption] = useState("");

  const handleCheckboxChange = (option) => {
    setLocalSelectedOption(option);
    setSelectedOption(option);
  };

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={localSelectedOption === "Student"}
          onChange={() => handleCheckboxChange("Student")}
        />
        Student
      </label>
      <label>
        <input
          type="checkbox"
          checked={localSelectedOption === "Company"}
          onChange={() => handleCheckboxChange("Company")}
        />
        Company
      </label>
    </div>
  );
};

const Signup = (props) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [logo, setLogo] = useState("");
  const [university, setUniversity] = useState("");
  const [skills, setSkills] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const signUp = async (e) => {
    e.preventDefault();

    const userData = {
      email,
      name: fullName,
      phone_number: phone,
      "custom:role": selectedOption,
      "custom:companyName": companyName,
      "custom:logo": logo,
      "custom:university": university,
      "custom:skills": skills,
    };

    try {
      const { user } = await Auth.signUp({
        username: email,
        password,
        attributes: userData,
      });
      console.log(user);
      await putUserToDynamoDB(userData);
      navigate("/login");
    } catch (error) {
      console.log("error signing up:", error);
      setError(error.message);
    }
  };

  return (
    <div className="Auth-form-container">
      <form className="Auth-form" onSubmit={signUp}>
        <div className="Auth-form-content">
          <h3 className="Auth-form-title">Sign Up</h3>
          <div className="form-group mt-3">
            <label>Full Name</label>
            <input
              type="text"
              className="form-control mt-1"
              placeholder="e.g Jane Doe"
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="form-group mt-3">
            <label>Email address</label>
            <input
              type="email"
              className="form-control mt-1"
              placeholder="Email Address"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group mt-3">
            <label>Phone Number</label>
            <input
              type="text"
              className="form-control mt-1"
              placeholder="Phone Number"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="form-group mt-3">
            <label>Password</label>
            <input
              type="password"
              className="form-control mt-1"
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="form-group mt-3">
            <p>
              <b>Are you registering as a student or a company?</b>
            </p>
            <CheckboxGroup setSelectedOption={setSelectedOption} />
          </div>
          <div className="form-group mt-3">
            {selectedOption === "Company" && (
              <div>
                <label>Company Name</label>
                <input
                  type="text"
                  className="form-control mt-1"
                  placeholder="Company Name"
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                <label>Logo</label>
                <input
                  type="text"
                  className="form-control mt-1"
                  placeholder="Logo"
                  onChange={(e) => setLogo(e.target.value)}
                />
              </div>
            )}
            {selectedOption === "Student" && (
              <div>
                <label>University</label>
                <input
                  type="text"
                  className="form-control mt-1"
                  placeholder="University"
                  onChange={(e) => setUniversity(e.target.value)}
                />
                <label>Skills</label>
                <input
                  type="text"
                  className="form-control mt-1"
                  placeholder="Skills"
                  onChange={(e) => setSkills(e.target.value)}
                />
              </div>
            )}
          </div>
          {!(error === "") && (
            <div className="error mt-3">
              <p>{error}</p>
            </div>
          )}
          <div className="d-grid gap-2 mt-3">
            <button type="submit" className="btn btn-primary">
              Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Signup;
