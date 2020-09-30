/*
 * @Author: hainan dong
 * @Date: 2020-09-28 14:12:04
 * @LastEditTime: 2020-09-30 09:54:42
 * @LastEditors: hainan dong
 * @Description: 
 * @FilePath: \react-gantt-schedule-timeline-calendar\src\components\GSTC.js
 * @Code Is Everything
 */
import React, { useCallback, useEffect, useRef } from 'react';
import GSTC from 'gantt-schedule-timeline-calendar';
import '../App.css'

export { GSTC };
export default function GSTCWrapper({ config, onLoad }) {
  let gstc = useRef(null);
  let mounted = useRef(false);

  const callback = useCallback(
    (node) => {
      if (node && !mounted.current) {
        node.addEventListener('gstc-loaded', () => {
          onLoad(gstc.current);
        });
        gstc.current = GSTC({
          element: node,
          state: config.current
            ? GSTC.api.stateFromConfig(config.current)
            : GSTC.api.stateFromConfig(config),
        });
        mounted.current = true;
      }
    },
    [config, onLoad]
  );

  useEffect(() => {
    return () => {
      if (gstc.current) {
        gstc.current.app.destroy();
      }
    };
  });

  return <div className="gstc-wrapper" ref={callback} />;
}
