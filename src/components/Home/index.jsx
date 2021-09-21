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
const { Header, Footer, Sider, Content } = Layout;

// const SERVER_URL = "http://localhost:5000/";
const SERVER_URL = "https://video-chat-code.herokuapp.com/";
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
  const [userMicStatus, setUserMicStatus] = useState(true);
  const [userName, setUserName] = useState("");

  const [showCallingModal, setShowCallingModal] = useState(false);

  const myVideo = useRef();
  const userVideo = useRef();
  const Audio = useRef();
  const peerConnectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((currentStream) => {
        setStream(currentStream);
        myVideo.current.srcObject = currentStream;
      })
      .catch((err) => {
        console.log("navigator video err:", err);
      });

    // Get and Set Socket Id
    SOCKET_CLIENT.on("socketId", (id) => {
      console.log("Server Connected.", id);
      setSocketId(id);
    });

    // Get Caller Info from Server
    SOCKET_CLIENT.on("callUser", ({ from, callerName, signal }) => {
      console.log("on callUser", from, "callerName:", callerName);
      setCall({ isReceivingCall: true, from, callerName, signal });
    });

    SOCKET_CLIENT.on("updateUserMedia", ({ type, currentMediaStatus }) => {
      console.log(
        "updateUserMedia => type:",
        type,
        "currentMediaStatus:",
        currentMediaStatus
      );
      if (currentMediaStatus !== null || currentMediaStatus !== []) {
        switch (type) {
          case "video":
            setUserVideoStatus(currentMediaStatus);
            break;
          case "mic":
            setUserMicStatus(currentMediaStatus);
            break;
          default:
            setUserMicStatus(currentMediaStatus[0]);
            setUserVideoStatus(currentMediaStatus[1]);
            break;
        }
      }
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
    console.log("callUser func");
    const peer = new Peer({ initiator: true, trickle: false, stream });
    setCallerUser(sktId);
    peer.on("signal", (data) => {
      console.log("callUser func => signal data:", data);
      // Pass Signal Data To Server
      SOCKET_CLIENT.emit("callUser", {
        userToCall: sktId,
        signalData: data,
        from: socketId,
        name,
      });
    });

    peer.on("stream", (currentStream) => {
      console.log("callUser func => peer stream:", currentStream);
      userVideo.current.srcObject = currentStream;
    });

    SOCKET_CLIENT.on("callAccepted", ({ signal, userName }) => {
      console.log(
        "callUser func => callAccepted => signal:",
        signal,
        "userName:",
        userName
      );
      setCallAccepted(true);
      setUserName(userName);
      peer.signal(signal);

      console.log("callUser func => updateMyMedia");
      SOCKET_CLIENT.emit("updateMyMedia", {
        type: "both",
        currentMediaStatus: [myMicStatus, myVideoStatus],
      });
    });

    peerConnectionRef.current = peer;
    console.log(peerConnectionRef.current);
  };

  // Accept Incoming Call
  const answerCall = () => {
    console.log("answerCall func");
    setCallAccepted(true);
    setCallerUser(call.from);
    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on("signal", (data) => {
      console.log("answerCall func => Peer Signal:", data);
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
      console.log("answerCall func => Peer stream:", currentStream);
      userVideo.current.srcObject = currentStream;
    });

    peer.signal(call.signal);

    peerConnectionRef.current = peer;
    console.log(peerConnectionRef?.current);
  };

  // Cancel Incoming Call
  const handleCancelIncoming = () => {
    console.log("handleCancelIncoming func");
    setShowCallingModal(false);
    leaveCall();
    window.location.reload();
  };

  // End and Leave Call
  const leaveCall = () => {
    console.log("leaveCall func");
    setCallEnded(true);
    peerConnectionRef?.current?.destroy();
    SOCKET_CLIENT.emit("endCall", { id: callerUser });
    window.location.reload();
  };

  // Update My Video
  const updateMyVideo = () => {
    // setMyVdoStatus((currentStatus) => {
    //   socket.emit("updateMyMedia", {
    //     type: "video",
    //     currentMediaStatus: !currentStatus,
    //   });
    //   stream.getVideoTracks()[0].enabled = !currentStatus;
    //   return !currentStatus;
    // });

    stream.getVideoTracks()[0].enabled = !myVideoStatus;
    setMyVideoStatus(!myVideoStatus);
  };

  // Update My Mic
  const updateMyMic = () => {
    // setMyMicStatus((currentStatus) => {
    //   socket.emit("updateMyMedia", {
    //     type: "mic",
    //     currentMediaStatus: !currentStatus,
    //   });
    //   stream.getAudioTracks()[0].enabled = !currentStatus;
    //   return !currentStatus;
    // });
    stream.getAudioTracks()[0].enabled = !myMicStatus;
    setMyMicStatus(!myMicStatus);
  };

  return (
    <Layout className={`${classes.layoutWrapper}`}>
      <Header className={`${classes.headerWrapper}`}>Video Chat</Header>
      <Content className={`${classes.contentWrapper}`}>
        <div className={`${classes.container}`}>
          <div className={`${classes.videosBlockWrapper}`}>
            <div className={`${classes.videoContainer}`}>
              <div className={`${classes.videoHeading}`}>
                <h2>{name}</h2>
              </div>
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
              <div className={`${classes.videoProps}`}>
                <span onClick={() => updateMyMic()}>
                  {myMicStatus ? (
                    <img src={MicOnIcon} alt="Mic On" />
                  ) : (
                    <img src={MicOffIcon} alt="Mic Off" />
                  )}
                </span>
                <span onClick={() => updateMyVideo()}>
                  {myVideoStatus ? (
                    <img src={VideoOnIcon} alt="video on icon" />
                  ) : (
                    <img src={VideoOffIcon} alt="video off icon" />
                  )}
                </span>
                {callAccepted && !callEnded && (
                  <>
                    <span>
                      <img src={Msg} alt="chat icon" />
                    </span>
                    <span>
                      <img src={ScreenShare} alt="share screen" />
                    </span>
                  </>
                )}
              </div>
            </div>
            {/* Other User */}
            {callAccepted && !callEnded && userVideo && (
              <div className={`${classes.videoContainer}`}>
                <div className={`${classes.videoHeading}`}>
                  <h2>{userVideoStatus && (call.callerName || userName)}</h2>
                </div>
                <div className={`${classes.videoBlock}`} id="userVideo">
                  <video
                    playsInline
                    ref={userVideo}
                    // onClick={fullScreen}
                    autoPlay
                    className={`${classes.videoActive}`}
                    style={{
                      opacity: `${userVideoStatus ? "1" : "0"}`,
                    }}
                  />
                </div>
                <div className={`${classes.videoProps2}`}>
                  {/* <span>
                    <img src={MicOnIcon} alt="Mic On" />
                  </span>
                  <span>
                    <img src={Msg} alt="chat icon" />
                  </span>
                  <span>
                    <img src={VideoOnIcon} alt="video on icon" />
                  </span>
                  <span>
                    <img src={ScreenShare} alt="share screen" />
                  </span> */}
                </div>
              </div>
            )}
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
            {callAccepted && !callEnded ? (
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
            )}

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
