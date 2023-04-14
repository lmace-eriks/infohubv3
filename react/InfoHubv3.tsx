import React, { ReactChildren, useRef, createRef } from "react";
// import { canUseDOM } from "vtex.render-runtime";

// Styles
import styles from "./styles.css";

interface InfoHubv3Props {

}

const zero = "0px";

const InfoHubv3: StorefrontFunctionComponent<InfoHubv3Props> = ({ }) => {

  return (
    <div className={styles.container}>
      Info Hub V3
    </div>
  );
}

InfoHubv3.schema = {
  title: "InfoHubv3",
  description: "",
  type: "object",
  properties: {

  }
}

export default InfoHubv3;
