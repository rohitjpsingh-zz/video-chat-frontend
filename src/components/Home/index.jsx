import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";
import classes from "./Home.module.css";
import { Layout, Input, Button, message, Modal } from "antd";
import { CopyToClipboard } from "react-copy-to-clipboard";
import Phone from "../../assets/phone.gif";

import Teams from "../../assets/teams.mp3";
import {
  PhoneOutlined,
} from "@ant-design/icons";
const { Header, Footer, Sider, Content } = Layout;

const SERVER_URL = "http://localhost:5000/";
// const SERVER_URL = "https://375d-106-222-28-99.ngrok.io/";
const SOCKET_CLIENT = io(SERVER_URL);

function Home() {
  const [stream, setStream] = useState();
  const [chat, setChat] = useState([]);
  const [socketId, setSocketId] = useState("");
  const [name, setName] = useState("");
  const [call, setCall] = useState({});
  const [myVideoStatus, setMyVideoStatus] = useState(true);
  const [myMicStatus, setMyMicStatus] = useState(true);
  const [socketIdToCall, setSocketIdToCall] = useState("");
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [callerUser, setCallerUser] = useState("");
  const [userVideoStatus, setUserVideoStatus] = useState(true);


  const [showCallingModal, setShowCallingModal] = useState(false);


  const myVideo = useRef();
  const userVideo = useRef();
  const Audio = useRef();
  const peerConnectionRef = useRef();


  useEffect(() => {
    console.log("myVideo:", myVideo);
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      }).then((currentStream) => {
        console.log("currentStream:", currentStream);
        setStream(currentStream);
        myVideo.current.srcObject = currentStream;
      }).catch((err) => {
        console.log("navigator video err:", err);
      });

    // Get and Set Socket Id
    SOCKET_CLIENT.on("socketId", (id) => {
      setSocketId(id);
      console.log("Server Connected.", id);
    });

    // Get Caller Info from Server
    SOCKET_CLIENT.on("callUser", ({ from, callerName, signal }) => {
      console.log(`from:${from} | name:${callerName} `);
      setCall({ isReceivingCall: true, from, callerName, signal });
    });

  }, []);

  // Check Any Incomining Call
  useEffect(() => {
    if (call.isReceivingCall && !callAccepted) {
      setShowCallingModal(true);
      setCallerUser(call.from);
    } else setShowCallingModal(false);
  }, [call.isReceivingCall]);

  //full screen
  const fullScreen = (e) => {
    const elem = e.target;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      /* Firefox */
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
      /* Chrome, Safari & Opera */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      /* IE/Edge */
      elem.msRequestFullscreen();
    }
  };

  // Connect Call
  const callUser = (sktId) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    console.log("sktId:",sktId,"peer:",peer);
    setCallerUser(sktId);
    peer.on("signal", (data) => {
      console.log("sktId == socketId",(sktId == socketId),"signalData:",data);
      // Pass Signal Data To Server
      SOCKET_CLIENT.emit("callUser", {
        userToCall: sktId,
        signalData: data,
        from: socketId,
        name,
      });
    });
  };


  
  // Accept Incoming Call
  const answerCall = () => {
    setCallAccepted(true);
    setCallerUser(call.from);
    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on("signal", (data) => {
      // Pass Signal Data To Server
      SOCKET_CLIENT.emit("answerCall", {
        signal: data,
        to: call.from,
        userName: name,
        type: "both",
        myMediaStatus: [myMicStatus, myVideoStatus],
      });
    });

    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });

    peer.signal(call.signal);

    peerConnectionRef.current = peer;
    console.log(peerConnectionRef?.current);
  };

  // Cancel Incoming Call
  const handleCancelIncoming = () => {
    setShowCallingModal(false);
    leaveCall();
    window.location.reload();
  };


  // End and Leave Call
  const leaveCall = () => {
    setCallEnded(true);
    peerConnectionRef?.current?.destroy();
    SOCKET_CLIENT.emit("endCall", { id: callerUser });
    window.location.reload();
  };



  return (
    <Layout className={`${classes.layoutWrapper}`}>
      <Header className={`${classes.headerWrapper}`}>Video Chat</Header>
      <Content className={`${classes.contentWrapper}`}>
        <div className={`${classes.container}`}>
          <div className={`${classes.videosBlockWrapper}`}>
            <div className={`${classes.videoBlock}`} id="myVideo">
              {stream ? (
                <video
                  playsInline
                  muted
                  // onClick={fullScreen}
                  ref={myVideo}
                  autoPlay
                  className={`${classes.videoActive}`}
                  style={{
                    opacity: `${myVideoStatus ? "1" : "0"}`,
                  }}
                />
              ) : (
                <span>My Video</span>
              )}
            </div>
            <div className={`${classes.videoBlock}`} id="userVideo"> 
              {callAccepted && !callEnded && userVideo ? (
                <video
                  playsInline
                  ref={userVideo}             
                  // onClick={fullScreen}
                  autoPlay
                  className="video-active"
                  style={{
                    opacity: `${userVideoStatus ? "1" : "0"}`,
                  }}
                />
              ) : (
                <span>User Video</span>
              )}          
            </div>
          </div>
          <div className={`${classes.videoActionWrapper}`}>
            <Input
              className={`${classes.inputName}`}
              placeholder="Enter Name"
              maxLength={15}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                localStorage.setItem("name", e.target.value);
              }}
            />
            <Input
              className={`${classes.inputCode}`}
              placeholder="Enter Code"
              value={socketIdToCall}
              onChange={(e) => setSocketIdToCall(e.target.value)}
            />
            {
              callAccepted && !callEnded ? (
                <Button
                  className={`${classes.startBtn}`}
                  type="danger"
                  onClick={leaveCall}
                >
                  Hang up
                </Button>
              ) : (
                <Button
                  className={`${classes.startBtn}`}
                  type="primary"
                  onClick={() => {
                    if (name.length) callUser(socketIdToCall);
                    else message.error("Please enter your name to call!");
                  }}
                >
                  Start Join
                </Button>
              )
            }     


            <CopyToClipboard text={socketId}>
              <Button
                className={`${classes.startBtn}`}
                type="primary"
                onClick={() => message.success("Code copied successfully!")}
              >
                Copy Code
              </Button>
            </CopyToClipboard>
          </div>
        </div>
       
        {call.isReceivingCall && !callAccepted && (
          <>
          <audio src={Teams} loop ref={Audio} />
          <Modal
            title="Incoming Call"
            visible={showCallingModal}
            onOk={() => setShowCallingModal(false)}
            onCancel={handleCancelIncoming}
            footer={null}
          >
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <h1>
                {call.callerName} is calling you...
                <img
                  src={Phone}
                  alt="phone ringing"
                  className={classes.phone}
                  style={{ display: "inline-block" }}
                />
              </h1>
            </div>
            <div className={classes.btnDiv}>
              <Button
                variant="contained"
                className={classes.answer}
                color="#29bb89"
                icon={<PhoneOutlined />}
                onClick={() => {
                  answerCall();
                  Audio.current.pause();
                }}
                tabIndex="0"
              >
                Answer
              </Button>
              <Button
                variant="contained"
                className={classes.decline}
                icon={<PhoneOutlined />}
                onClick={() => {
                  setShowCallingModal(false);
                  Audio.current.pause();
                }}
                tabIndex="0"
              >
                Decline
              </Button>
            </div>
          </Modal>
        </>
        )}
      </Content>
      <Footer className={`${classes.footerWrapper}`}>
        Created By <b>ME</b>.
      </Footer>
    </Layout>
  );
}

export default Home;
