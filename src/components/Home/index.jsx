import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";
import classes from "./Home.module.css";
import { Layout, Input, Button, message, Modal } from "antd";
import { CopyToClipboard } from "react-copy-to-clipboard";
import Phone from "../../assets/phone.gif";
import Msg from "../../assets/msg.svg";
import ScreenShare from "../../assets/share_screen.svg";
import MicOnIcon from "../../assets/unmute_mic.svg";
import MicOffIcon from "../../assets/mute_mic.svg";
import VideoOnIcon from "../../assets/video.svg";
import VideoOffIcon from "../../assets/video-off.svg";

import Teams from "../../assets/teams.mp3";
import { PhoneOutlined } from "@ant-design/icons";
const { Header, Footer, Content } = Layout;

const SERVER_URL = "http://localhost:5000/";
// const SERVER_URL = "https://video-chat-code.herokuapp.com/";
const SOCKET_CLIENT = io(SERVER_URL);

function Home() {
  const [currentSktId, setCurrentSktId] = useState("");
  const [currentStream, setCurrentStream] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [mainSktId, setMainSktId] = useState("");
  const [incomingRequest, setIncomingRequest] = useState({});
  const [incomingVisible, setIncomingVisible] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);

  const myVideo = useRef();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((currentStream) => {
        myVideo.current.srcObject = currentStream;
      });

    // Get and Set Socket Id
    SOCKET_CLIENT.on("socketId", (id) => {
      console.log("Server Connected.", id);
      setCurrentSktId(id);
    });

    // Check Incoming Request
    SOCKET_CLIENT.on("incomingRequest", (data) => {
      console.log("incomingRequest:", data);
      setIncomingRequest(data);
      setIncomingVisible(true);
    });
  }, []);

  const hideModal = () => {
    setIncomingVisible(false);
    setIncomingRequest({});
  };

  const startJoin = () => {
    const peer = new Peer({ initiator: true, trickle: false, currentStream });
    peer.on("signal", (data) => {
      SOCKET_CLIENT.emit("startJoin", {
        mainUserId: mainSktId,
        childUserId: currentSktId,
        childUserName: currentUsername,
        childUserSignal: data,
      });
    });
  };

  const acceptRequest = () => {
    saveConnectedUsers();
    hideModal();
  };

  const saveConnectedUsers = () => {
    // Check User Exist
    let checkUser = connectedUsers.filter(
      (item) => item.childUserId == incomingRequest.childUserId
    );
    if (checkUser.length) {
      let refreshUsers = connectedUsers.map((item1) => {
        if (item1.childUserId == incomingRequest.childUserId) {
          return incomingRequest;
        }
        return item1;
      });
      setConnectedUsers(refreshUsers);
    } else {
      setConnectedUsers([...connectedUsers, incomingRequest]);
    }
  };

  return (
    <Layout className={`${classes.layoutWrapper}`}>
      <Header className={`${classes.headerWrapper}`}>Video Chat</Header>
      <Content className={`${classes.contentWrapper}`}>
        <div className={`${classes.container}`}>
          <div className={`${classes.videosBlockWrapper}`}>
            <div className={`${classes.videoContainer}`}>
              <div className={`${classes.videoHeading}`}>
                <h2>{currentUsername + `(You)`}</h2>
              </div>
              <div className={`${classes.videoBlock}`}>
                <video
                  playsInline
                  muted
                  // onClick={fullScreen}
                  ref={myVideo}
                  autoPlay
                  className={`${classes.videoActive}`}
                  style={
                    {
                      // opacity: `${myVideoStatus ? "1" : "0"}`,
                    }
                  }
                />
              </div>
              <div className={`${classes.videoProps}`}>
                <span>
                  <img src={MicOnIcon} alt="Mic On" />
                </span>
                <span>
                  <img src={VideoOnIcon} alt="video on icon" />
                </span>
                <span>
                  <img src={Msg} alt="chat icon" />
                </span>
                <span>
                  <img src={ScreenShare} alt="share screen" />
                </span>
              </div>
            </div>

            {connectedUsers &&
              connectedUsers.length > 0 &&
              connectedUsers.map((user, index) => (
                <div
                  key={index}
                  className={`${classes.videoContainer} ${classes.otherUser}`}
                >
                  <div className={`${classes.videoHeading}`}>
                    <h2>{user.childUserName}</h2>
                  </div>
                  <div className={`${classes.videoBlock}`}>
                    <video
                      playsInline
                      muted
                      // onClick={fullScreen}
                      ref={myVideo}
                      autoPlay
                      className={`${classes.videoActive}`}
                      style={
                        {
                          // opacity: `${myVideoStatus ? "1" : "0"}`,
                        }
                      }
                    />
                  </div>
                  <div className={`${classes.videoProps}`}>
                    <span>
                      <img src={MicOnIcon} alt="Mic On" />
                    </span>
                    <span>
                      <img src={VideoOnIcon} alt="video on icon" />
                    </span>
                    <span>
                      <img src={Msg} alt="chat icon" />
                    </span>
                    <span>
                      <img src={ScreenShare} alt="share screen" />
                    </span>
                  </div>
                </div>
              ))}
          </div>
          <div className={`${classes.videoActionWrapper}`}>
            <Input
              className={`${classes.inputName}`}
              placeholder="Enter Name"
              maxLength={15}
              value={currentUsername}
              onChange={(e) => setCurrentUsername(e.target.value)}
            />
            <Input
              className={`${classes.inputCode}`}
              placeholder="Enter Code"
              value={mainSktId}
              onChange={(e) => setMainSktId(e.target.value)}
            />
            <Button
              className={`${classes.startBtn}`}
              type="primary"
              onClick={startJoin}
            >
              Start Join
            </Button>

            <CopyToClipboard text={currentSktId}>
              <Button
                className={`${classes.startBtn}`}
                type="primary"
                onClick={() => message.success("Code copied successfully!")}
              >
                Copy Code
              </Button>
            </CopyToClipboard>
          </div>

          <p>{`incomingRequest:` + JSON.stringify(incomingRequest)}</p>
          <p>{`Connected Users:` + JSON.stringify(connectedUsers)}</p>

          <Modal
            title="New Meeting Request"
            visible={incomingVisible}
            onCancel={hideModal}
            footer={false}
          >
            <p>{`${
              incomingRequest ? incomingRequest.childUserName : "New User"
            } want to join this meeting.`}</p>
            <div className={`${classes.btnDiv}`}>
              <Button type="primary" onClick={acceptRequest}>
                Accept
              </Button>
              <Button type="danger" onClick={hideModal}>
                Decline
              </Button>
            </div>
          </Modal>
        </div>
      </Content>
      <Footer className={`${classes.footerWrapper}`}>
        Created By <b>ME</b>.
      </Footer>
    </Layout>
  );
}

export default Home;
