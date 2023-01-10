import React, { useEffect, useState } from "react";
import "./styles/App.css";
import twitterLogo from "./assets/twitter-logo.svg";
import { ethers } from "ethers";
import contractAbi from "./utils/contractABI.json";
import polygonLogo from "./assets/polygonlogo.png";
import ethLogo from "./assets/ethlogo.png";
import { networks } from "./utils/networks";

const TWITTER_HANDLE = "DominusMoris";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const tld = ".dom";
const CONTRACT_ADDRESS = "0x6185B6a97E09A80eF83D05982DB271f300e96Fe5";

const App = () => {
  const [mints, setMints] = useState([]);
  const [network, setNetwork] = useState("");

  const [currentAccount, setCurrentAccount] = useState("");
  const [editing, setEditing] = useState(false);

  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState("");

  useEffect(() => {
    if (network === "Polygon Mumbai Testnet") {
      fetchMints();
    }
  }, [currentAccount, network]);

  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask -> https://metamask.io/");
        return;
      }

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      console.log("Make sure you have MetaMask!");
      return;
    } else {
      console.log("We have the ethereum object", ethereum);
    }

    const accounts = await ethereum.request({ method: "eth_accounts" });

    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log("Found an authorized account:", account);
      setCurrentAccount(account);
    } else {
      console.log("No authorized account found");
    }
    const chainId = await ethereum.request({ method: "eth_chainId" });
    setNetwork(networks[chainId]);

    ethereum.on("chainChanged", handleChainChanged);

    // Reload the page when they change networks
    function handleChainChanged(_chainId) {
      window.location.reload();
    }
  };
  const switchNetwork = async () => {
    if (window.ethereum) {
      try {
        // Try to switch to the Mumbai testnet
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x13881" }],
        });
      } catch (error) {
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x13881",
                  chainName: "Polygon Mumbai Testnet",
                  rpcUrls: ["https://rpc-mumbai.maticvigil.com/"],
                  nativeCurrency: {
                    name: "Mumbai Matic",
                    symbol: "MATIC",
                    decimals: 18,
                  },
                  blockExplorerUrls: ["https://mumbai.polygonscan.com/"],
                },
              ],
            });
          } catch (error) {
            console.log(error);
          }
        }
        console.log(error);
      }
    } else {
      // If window.ethereum is not found then MetaMask is not installed
      alert(
        "MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html"
      );
    }
  };

  const updateDomain = async () => {
    if (!record || !domain) {
      return;
    }
    setLoading(true);
    console.log("Updating domain", domain, "with record", record);
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractAbi.abi,
          signer
        );

        let tx = await contract.setRecord(domain, record);
        await tx.wait();
        console.log("Record set https://mumbai.polygonscan.com/tx/" + tx.hash);

        fetchMints();
        setRecord("");
        setDomain("");
      }
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  const mintDomain = async () => {
    // Don't run if the domain is empty
    if (!domain) {
      return;
    }
    // Alert the user if the domain is too short
    if (domain.length < 3) {
      alert("Domain must be at least 3 characters long");
      return;
    }
    // Calculate price based on length of domain (change this to match your contract)
    // 3 chars = 0.5 MATIC, 4 chars = 0.3 MATIC, 5 or more = 0.1 MATIC
    const price =
      domain.length === 3 ? "0.5" : domain.length === 4 ? "0.3" : "0.1";
    console.log("Minting domain", domain, "with price", price);
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractAbi.abi,
          signer
        );

        console.log("Going to pop wallet now to pay gas...");
        let tx = await contract.register(domain, {
          value: ethers.utils.parseEther(price),
        });
        // Wait for the transaction to be mined
        const receipt = await tx.wait();

        // Check if the transaction was successfully completed
        if (receipt.status === 1) {
          console.log(
            "Domain minted! https://mumbai.polygonscan.com/tx/" + tx.hash
          );

          // Set the record for the domain
          tx = await contract.setRecord(domain, record);
          await tx.wait();

          console.log(
            "Record set! https://mumbai.polygonscan.com/tx/" + tx.hash
          );

          // Call fetchMints after 2 seconds
          setTimeout(() => {
            fetchMints();
          }, 2000);

          setRecord("");
          setDomain("");
        } else {
          alert("Transaction failed! Please try again");
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchMints = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        // You know all this
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractAbi.abi,
          signer
        );

        // Get all the domain names from our contract
        const names = await contract.getAllNames();

        // For each name, get the record and the address
        const mintRecords = await Promise.all(
          names.map(async (name) => {
            const mintRecord = await contract.records(name);
            const owner = await contract.domains(name);
            return {
              id: names.indexOf(name),
              name: name,
              record: mintRecord,
              owner: owner,
            };
          })
        );

        console.log("MINTS FETCHED ", mintRecords);
        setMints(mintRecords);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const renderNotConnectedContainer = () => (
    <div className="connect-wallet-container">
      <div className="logo-container">
        <svg
          width="312"
          height="312"
          viewBox="0 0 312 312"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="wheel"
            id="violet-rhombus"
            d="M156 57.3124L118.063 118L57.3752 155.937L76.7502 76.6874L156 57.3124Z"
            fill="#413EDB"
          />
          <path
            className="wheel"
            id="fuschia-outer"
            d="M38.3749 86.1255L76.7499 76.688L57.3749 155.938L76.7499 235.063L38.3749 225.688L7.43738 155.938L38.3749 86.1255Z"
            fill="#A63099"
          />
          <path
            className="wheel"
            id="fuschia-inner"
            d="M118.125 193.875L57.3752 155.938L118.063 118L94.3752 155.938L118.125 193.875Z"
            fill="#A63099"
          />
          <path
            className="wheel"
            id="pink-dark-rhombus"
            d="M118.125 193.875L156 254.5L76.7502 235.062L57.3752 155.938L118.125 193.875Z"
            fill="#7F0A77"
          />
          <path
            className="wheel"
            id="pink-inner"
            d="M193.938 193.875L156 254.5L118.125 193.875L156 217.563L193.938 193.875Z"
            fill="#E24084"
          />
          <path
            className="wheel"
            id="pink-outer"
            d="M235.188 235.125L225.75 273.563L156 304.5L86.1876 273.563L76.7501 235.063L156 254.5L235.188 235.125Z"
            fill="#E24084"
          />
          <path
            className="wheel"
            id="pink-med-rhombus"
            d="M254.562 155.938L235.187 235.125L156 254.5L193.938 193.875L254.562 155.938Z"
            fill="#A63099"
          />
          <path
            className="wheel"
            id="blue-inner"
            d="M254.563 155.938L193.938 193.875L217.625 155.938L193.938 118.063L254.563 155.938Z"
            fill="#5A94E8"
          />
          <path
            className="wheel"
            id="blue-outer"
            d="M273.625 86.1255L304.563 155.938L273.625 225.688L235.188 235.126L254.563 155.938L235.125 76.688L273.625 86.1255Z"
            fill="#5A94E8"
          />
          <path
            className="wheel"
            id="blue-rhombus"
            d="M235.125 76.6874L254.562 155.937L193.938 118.062L156 57.3124L235.125 76.6874Z"
            fill="#4664E5"
          />
          <path
            className="wheel"
            id="teal-inner"
            d="M156 57.3124L193.938 118.062L156 94.3124L118.062 118L156 57.3124Z"
            fill="#6EC7EC"
          />
          <path
            className="wheel"
            id="teal-outer"
            d="M225.75 38.3124L235.125 76.6874L156 57.3124L76.7501 76.6874L86.1876 38.3124L156 7.37488L225.75 38.3124Z"
            fill="#6EC7EC"
          />
          <path
            id="outlines"
            d="M156 7.37512L225.75 38.6251L235.125 77.0001L273.625 86.4376L304.875 156.25L273.625 226L235.188 235.125L225.75 273.563L156 304.5L86.1876 273.563L76.7501 235.063L38.3751 225.688L7.43762 155.938L38.3751 86.1251L76.7501 77.0001L86.1876 38.6251L156 7.37512ZM156 217.563L193.938 193.875L217.625 155.938L193.938 118.063L156 94.3126L118.063 118L94.3751 155.938L118.125 193.875L156 217.563ZM156 0.562622L153.438 2.00012L83.6251 33.2501L80.8751 34.5001L80.1251 37.4376L71.5626 72.1876L36.8751 80.6876L33.8751 81.4376L32.6876 84.2501L1.75012 153.438L0.625122 155.938L1.75012 158.5L32.6876 228.25L33.9376 231.063L36.8751 231.75L71.5626 240.25L80.1251 275.063L80.8751 278.063L83.6251 279.313L153.438 310.563L156 311.688L158.563 310.563L228.313 279.313L231.063 278.063L231.813 275.063L240.375 240.313L275.125 231.75L278.125 231.063L279.313 228.25L310.563 158.5L311.688 155.938L310.563 153.438L279.313 83.6251L278.125 80.8126L275.125 80.0626L240.313 71.5626L231.813 36.8751L231 33.8751L228.25 32.6251L158.563 2.00012L156 0.562622ZM122.625 122.563L156 102L189.375 122.938L210.25 156.25L189.375 189.5L156 210.188L122.688 189.5L101.75 156.063L122.625 122.688V122.563Z"
            fill="white"
          />
          <path
            id="lines"
            d="M306 155.938L235.938 109.438L274.063 86.8126L273.25 85.5001L234.5 108.25L215.75 95.7501L203.25 77.0001L226.25 38.1876L224.938 37.3751L202.313 75.5626L156.625 6.93762L156 6.00012L109.5 76.0626L86.8751 37.8751L85.5626 38.6876L108.563 77.5001L96.0626 96.2501L77.3126 108.75L38.5626 85.7501L37.7501 87.0626L75.8751 109.688L7.12512 155.563L6.12512 156.188L76.1876 202.688L38.0626 225.313L38.8751 226.625L77.6251 203.625L96.3751 216.125L108.875 234.875L85.8751 273.625L87.1876 274.438L109.813 236.313L155.688 305.063L156.313 306.063L202.813 236L225.438 274.125L226.75 273.313L203.75 234.563L216.25 215.813L235 203.313L273.75 226.25L274.563 224.938L236.438 202.313L305.5 156.5L306 155.938ZM233 109.375L226.75 112.938L218.063 99.5001L233 109.375ZM153.75 153.75L86.3751 113.75L97.3126 97.2501L113.813 86.3126L153.75 153.75ZM115.063 85.4376L156 58.2501L196.938 85.3751L156 154.438L115.063 85.4376ZM154.438 155.938L85.6876 196.875L58.5626 155.938L85.6876 115.063L154.438 155.938ZM153.75 158.188L113.813 225.563L97.3126 214.5L86.3751 198.063L153.75 158.188ZM156 157.5L196.938 226.25L156 253.625L115.063 226.438L156 157.5ZM158.25 158.188L225.625 198.188L214.688 214.5L198.188 225.438L158.25 158.188ZM157.5 155.938L226.25 115.063L253.375 155.938L226.25 196.875L157.5 155.938ZM158.25 153.75L198.188 86.3126L214.688 97.2501L225.625 113.75L158.25 153.75ZM212.25 93.8751L198.75 84.9376L202.313 79.0001L212.25 93.8751ZM156 8.81262L201.625 77.5626L197.688 84.1876L156.438 56.7501H156L114.313 84.4376L110.375 77.8126L156 8.81262ZM109.438 78.9376L113 85.1876L99.7501 93.8751L109.438 78.9376ZM93.9376 99.5001L85.0001 112.938L78.7501 109.375L93.9376 99.5001ZM8.81262 155.75L77.5626 110.125L84.1251 114.5L56.7501 155.75L56.4376 156.188L84.1251 197.938L77.5626 201.813L8.81262 155.75ZM79.0001 202.313L85.2501 198.75L94.1876 212.25L79.0001 202.313ZM99.7501 218L113 227L109.438 233.25L99.7501 218ZM156 303.125L110.375 234.375L114.313 228.125L155.563 255.5L156 255.813L197.688 228.125L201.625 234.375L156 303.125ZM202.563 233.25L199 227L212.25 218L202.563 233.25ZM218.063 212.75L227 199.25L233.25 202.813L218.063 212.75ZM234.438 201.875L228.188 198L255.563 156.688V156.25L227.875 114.5L234.125 110.563L302.875 156.188L234.438 201.875Z"
            fill="white"
          />
        </svg>
        <br />
        <br />
        <br />
        <p v-if="metamaskInstalled" className="text">
          Please connect to Metamask to continue
        </p>
        <p className="text">
          Please{" "}
          <a href="https://metamask.io/download.html" className="link">
            install Metamask
          </a>{" "}
          to continue
        </p>
        {/* add 5 line breaks */}
        <br />
        <br />
        <br />
        <br />
        <br />
      </div>
      <button
        onClick={connectWallet}
        className="cta-button connect-wallet-button"
      >
        Connect Wallet
      </button>
    </div>
  );

  const renderInputForm = () => {
    if (network !== "Polygon Mumbai Testnet") {
      return (
        <div className="connect-wallet-container">
          <p>Please connect to Polygon Mumbai Testnet</p>
          <button className="cta-button mint-button" onClick={switchNetwork}>
            Click here to switch
          </button>
        </div>
      );
    }
    // const editRecord = (name) => {
    //   console.log("Editing record for", name);
    //   setEditing(true);
    //   setDomain(name);
    // };

    return (
      <div className="form-container">
        <div className="first-row">
          <input
            type="text"
            value={domain}
            placeholder="domain"
            onChange={(e) => setDomain(e.target.value)}
          />
          <p className="tld"> {tld} </p>
        </div>

        <input
          type="text"
          value={record}
          placeholder="whats ur ninja power?"
          onChange={(e) => setRecord(e.target.value)}
        />
        {/* If the editing variable is true, return the "Set record" and "Cancel" button */}
        {editing ? (
          <div className="button-container">
            <button
              className="cta-button mint-button"
              disabled={loading}
              onClick={updateDomain}
            >
              Set record
            </button>
            <button
              className="cta-button mint-button"
              onClick={() => {
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="cta-button mint-button"
            disabled={loading}
            onClick={mintDomain}
          >
            Mint
          </button>
        )}
      </div>
    );
  };

  const renderMints = () => {
    const editRecord = (name) => {
      console.log("Editing record for", name);
      setEditing(true);
      setDomain(name);
    };
    if (currentAccount && mints.length > 0) {
      return (
        <div className="mint-container">
          <p className="subtitle"> Recently minted domains!</p>
          <div className="mint-list">
            {mints.map((mint, index) => {
              return (
                <div className="mint-item" key={index}>
                  <div className="mint-row">
                    <a
                      className="link"
                      href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <p className="underlined">
                        {" "}
                        {mint.name}
                        {tld}{" "}
                      </p>
                    </a>
                    {/* If mint.owner is currentAccount, add an "edit" button*/}
                    {mint.owner.toLowerCase() ===
                    currentAccount.toLowerCase() ? (
                      <button
                        className="edit-button"
                        onClick={() => editRecord(mint.name)}
                      >
                        <img
                          className="edit-icon"
                          src="https://img.icons8.com/metro/26/000000/pencil.png"
                          alt="Edit button"
                        />
                      </button>
                    ) : null}
                  </div>
                  <p> {mint.record} </p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <header>
            <div className="left">
              <p className="title">🔗💰 Dom Name Service</p>
              <p className="subtitle">Your One-Stop Shop for ENS Domains</p>
            </div>
            <div className="right">
              <img
                alt="Network logo"
                className="logo"
                src={network.includes("Polygon") ? polygonLogo : ethLogo}
              />
              {currentAccount ? (
                <p>
                  {" "}
                  Wallet: {currentAccount.slice(0, 6)}...
                  {currentAccount.slice(-4)}{" "}
                </p>
              ) : (
                <p> Not connected </p>
              )}
            </div>
          </header>
        </div>
        {!currentAccount && renderNotConnectedContainer()}
        {currentAccount && renderInputForm()}
        {mints && renderMints()}

        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >
            {`built with @${TWITTER_HANDLE}`}
          </a>
        </div>
      </div>
    </div>
  );
};

export default App;
