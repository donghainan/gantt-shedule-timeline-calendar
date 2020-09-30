// App.js
// 配置列表：https://gantt-schedule-timeline-calendar.neuronet.io/documentation/configuration
/**
 * 需求：
 * 1、不可跨行
 * 2、不可重叠
 * 3、默认他人不可被修改
 * 4、自己的可以修改
 * 5、默认展示当前日期到之后的15天
 */
import React, { useEffect, useRef } from "react";
import GSTCComponent, { GSTC } from "./components/GSTC";
import { Plugin as ItemMovement } from "gantt-schedule-timeline-calendar/dist/plugins/item-movement.esm.min";
import { Plugin as Selection } from "gantt-schedule-timeline-calendar/dist/plugins/selection.esm.min";
import { Plugin as TimelinePointer } from "gantt-schedule-timeline-calendar/dist/plugins/timeline-pointer.esm.min";
import { Plugin as ItemResizing } from "gantt-schedule-timeline-calendar/dist/plugins/item-resizing.esm.min";

// 是否可以跨行移动
const canChangeRow = true;
// 是否允许同行内重叠
const canCollide = false;
// 不可选中的cell
const doNotSelectThisCells = ["2020-10-11"];
// 不可选中的items
const doNotSelectThisItems = [GSTC.api.GSTCID("4")];

// item 点击事件
const onItemClick = (item) => {
  // alert("Item " + GSTC.api.sourceID(item.id) + " clicked!");
};
// 渲染item内容
const itemLabelContent = ({ item, vido }) => {
  const { time } = item;
  const diffDays =
    GSTC.api.date(time.end).diff(GSTC.api.date(time.start), "day") + 1;
  return vido.html`<div class="my-item-content" style="cursor:pointer;width:100%;text-align:center;" @click=${() =>
    onItemClick(item)}>${diffDays}天</div>`;
};
// item移动设置
const movementPluginConfig = {
  moveable: "x",
  events: {
    onMove({ items }) {
      // prevent items to change row
      return items.before.map((beforeMovementItem, index) => {
        const afterMovementItem = items.after[index];
        const myItem = GSTC.api.merge({}, afterMovementItem);
        if (!canChangeRow) {
          myItem.rowId = beforeMovementItem.rowId;
        }
        if (!canCollide && isCollision(myItem)) {
          myItem.time = { ...beforeMovementItem.time };
          myItem.rowId = beforeMovementItem.rowId;
        }
        return myItem;
      });
    },
  },
  snapToTime: {
    start({ startTime, time }) {
      return startTime.startOf("day").add(24, "hour");
    },
  },
};
// item是否可以被选中
const canSelectItem = (item) => {
  if (typeof item.canSelect === "boolean") return item.canSelect;
  return !doNotSelectThisItems.includes(item.id);
};

// 禁止item选中
const preventSelection = (selecting) => {
  return {
    "chart-timeline-grid-row-cell": selecting[
      "chart-timeline-grid-row-cell"
    ].filter(
      (cell) =>
        !doNotSelectThisCells.includes(
          cell.time.leftGlobalDate.format("YYYY-MM-DD")
        )
    ),
    "chart-timeline-items-row-item": selecting[
      "chart-timeline-items-row-item"
    ].filter((item) => canSelectItem(item)),
  };
};

// 判断是否有重叠
const isCollision = (item) => {
  console.log(GSTC.api)
  const allItems = GSTC.api.getAllItems();
  for (const itemId in allItems) {
    if (itemId === item.id) continue;
    const currentItem = allItems[itemId];
    if (currentItem.rowId === item.rowId) {
      if (
        item.time.start >= currentItem.time.start &&
        item.time.start <= currentItem.time.end
      )
        return true;
      if (
        item.time.end >= currentItem.time.start &&
        item.time.end <= currentItem.time.end
      )
        return true;
      if (
        item.time.start <= currentItem.time.start &&
        item.time.end >= currentItem.time.end
      )
        return true;
      if (
        item.time.start >= currentItem.time.start &&
        item.time.end <= currentItem.time.end
      )
        return true;
    }
  }
  return false;
};

// 禁止选中cell项
const addCellBackground = ({ time, row, vido }) => {
  const isSelectable = !doNotSelectThisCells.includes(
    time.leftGlobalDate.format("YYYY-MM-DD")
  );
  // console.log("ceell", time.leftGlobalDate.format("YYYY-MM-DD"), isSelectable);
  return isSelectable
    ? vido.html`<div class="selectable-cell" style="width:100%;height:100%;"></div>`
    : vido.html`<div class="not-selectable-cell" style="width:100%;height:100%;">🚫</div>`;
};

// 是否允许缩放
const isItemResizable = (item) => {
  if (typeof item.resizable === "boolean") return item.resizable;
  return true;
};
// 限制缩放时间段
const limitTime = (item, oldItem) => {
  if (item.resizableFrom && item.time.start < item.resizableFrom) {
    item.time.start = item.resizableFrom;
  }
  if (item.resizableTo && item.time.end > item.resizableTo) {
    item.time.end = item.resizableTo;
  }
  if (item.resizableLength && item.resizablePeriod) {
    const actualDiff = GSTC.api
      .date(item.time.end)
      .diff(item.time.start, item.resizablePeriod, true);
    if (actualDiff > item.resizableLength) {
      const resizingFromStart = item.time.end === oldItem.time.end;
      if (resizingFromStart) {
        item.time.start = GSTC.api
          .date(item.time.end)
          .subtract(item.resizableLength, item.resizablePeriod) // -1 here because end of day - 3 days -> startOf day = almost 4 days
          .valueOf();
      } else {
        item.time.end = GSTC.api
          .date(item.time.start)
          .add(item.resizableLength, item.resizablePeriod)
          .valueOf();
      }
    }
  }
  return item;
};

// 缩放时间处理
const snapToTimeSeparately = (item) => {
  if (!item.snap) return item;
  const start = GSTC.api.date(item.time.start).startOf("day").add(24, "hour");
  const end = GSTC.api.date(item.time.end).startOf("day").add(24, "hour");
  item.time.start = start.valueOf();
  item.time.end = end.valueOf();
  // to change other properties than time we need to update item
  // because resizing-items plugin only works on time property
  GSTC.state.update(
    `config.chart.items.${item.id}.label`,
    `From ${start.format("YYYY-MM-DD HH:mm")} to ${end.format(
      "YYYY-MM-DD HH:mm"
    )}`
  );
  return item;
};

const App = () => {
  const GSTCID = GSTC.api.GSTCID;
  // 配置总项
  let config = useRef({
    licenseKey:
      "====BEGIN LICENSE KEY====\nXOfH/lnVASM6et4Co473t9jPIvhmQ/l0X3Ewog30VudX6GVkOB0n3oDx42NtADJ8HjYrhfXKSNu5EMRb5KzCLvMt/pu7xugjbvpyI1glE7Ha6E5VZwRpb4AC8T1KBF67FKAgaI7YFeOtPFROSCKrW5la38jbE5fo+q2N6wAfEti8la2ie6/7U2V+SdJPqkm/mLY/JBHdvDHoUduwe4zgqBUYLTNUgX6aKdlhpZPuHfj2SMeB/tcTJfH48rN1mgGkNkAT9ovROwI7ReLrdlHrHmJ1UwZZnAfxAC3ftIjgTEHsd/f+JrjW6t+kL6Ef1tT1eQ2DPFLJlhluTD91AsZMUg==||U2FsdGVkX1/SWWqU9YmxtM0T6Nm5mClKwqTaoF9wgZd9rNw2xs4hnY8Ilv8DZtFyNt92xym3eB6WA605N5llLm0D68EQtU9ci1rTEDopZ1ODzcqtTVSoFEloNPFSfW6LTIC9+2LSVBeeHXoLEQiLYHWihHu10Xll3KsH9iBObDACDm1PT7IV4uWvNpNeuKJc\npY3C5SG+3sHRX1aeMnHlKLhaIsOdw2IexjvMqocVpfRpX4wnsabNA0VJ3k95zUPS3vTtSegeDhwbl6j+/FZcGk9i+gAy6LuetlKuARjPYn2LH5Be3Ah+ggSBPlxf3JW9rtWNdUoFByHTcFlhzlU9HnpnBUrgcVMhCQ7SAjN9h2NMGmCr10Rn4OE0WtelNqYVig7KmENaPvFT+k2I0cYZ4KWwxxsQNKbjEAxJxrzK4HkaczCvyQbzj4Ppxx/0q+Cns44OeyWcwYD/vSaJm4Kptwpr+L4y5BoSO/WeqhSUQQ85nvOhtE0pSH/ZXYo3pqjPdQRfNm6NFeBl2lwTmZUEuw==\n====END LICENSE KEY====",
    utcMode: false,
    list: {
      rows: {
        [GSTCID("1")]: {
          id: GSTCID("1"),
          regionName: "中南",
          truckNumber: "苏NDW863",
          idleDays: "20",
          truckTypeName: "员工车",
          distance: "558KM",
        },
        [GSTCID("2")]: {
          id: GSTCID("2"),
          regionName: "中南",
          truckNumber: "苏NDW863",
          idleDays: "20",
          truckTypeName: "员工车",
          distance: "558KM",
        },
        [GSTCID("3")]: {
          id: GSTCID("3"),
          regionName: "中南",
          truckNumber: "苏NDW863",
          idleDays: "20",
          truckTypeName: "员工车",
          distance: "558KM",
        },
        [GSTCID("4")]: {
          id: GSTCID("4"),
          regionName: "中南",
          truckNumber: "苏NDW863",
          idleDays: "20",
          truckTypeName: "员工车",
          distance: "558KM",
        },
      },
      columns: {
        data: {
          [GSTCID("regionName")]: {
            id: GSTCID("regionName"),
            data: "regionName",
            header: {
              content: "大区",
            },
          },
          [GSTCID("truckNumber")]: {
            id: GSTCID("truckNumber"),
            data: "truckNumber",
            width: 100,
            header: {
              content: "车牌号",
            },
          },
          [GSTCID("idleDays")]: {
            id: GSTCID("idleDays"),
            data: "idleDays",
            header: {
              content: "闲置/时",
            },
          },
          [GSTCID("truckTypeName")]: {
            id: GSTCID("truckTypeName"),
            data: "truckTypeName",
            header: {
              content: "车辆属性",
            },
          },
          [GSTCID("distance")]: {
            id: GSTCID("distance"),
            data: "distance",
            header: {
              content: "位置距离",
            },
          },
        },
      },
      toggle: {
        display: false,
      },
    },
    chart: {
      items: {
        [GSTCID("1")]: {
          id: GSTCID("1"),
          rowId: GSTCID("1"),
          label: itemLabelContent,
          resizableFrom: GSTC.api.date().startOf("day").valueOf(),
          resizableTo: GSTC.api.date().add(14, "day").endOf("day").valueOf(),
          time: {
            start: GSTC.api.date().startOf("day").valueOf(),
            end: GSTC.api.date().add(1, "day").endOf("day").valueOf(),
          },
          canSelect: false,
        },
        [GSTCID("2")]: {
          id: GSTCID("2"),
          rowId: GSTCID("2"),
          label: itemLabelContent,
          resizableFrom: GSTC.api.date().startOf("day").valueOf(),
          resizableTo: GSTC.api.date().add(14, "day").endOf("day").valueOf(),
          time: {
            start: GSTC.api.date().add(4, "day").startOf("day").valueOf(),
            end: GSTC.api.date().add(5, "day").endOf("day").valueOf(),
          },
        },
        [GSTCID("3")]: {
          id: GSTCID("3"),
          rowId: GSTCID("2"),
          label: itemLabelContent,
          resizableFrom: GSTC.api.date().startOf("day").valueOf(),
          resizableTo: GSTC.api.date().add(14, "day").endOf("day").valueOf(),
          time: {
            start: GSTC.api.date().add(6, "day").startOf("day").valueOf(),
            end: GSTC.api.date().add(7, "day").endOf("day").valueOf(),
          },
        },
        [GSTCID("4")]: {
          id: GSTCID("4"),
          rowId: GSTCID("3"),
          label: itemLabelContent,
          resizableFrom: GSTC.api.date().startOf("day").valueOf(),
          resizableTo: GSTC.api.date().add(14, "day").endOf("day").valueOf(),
          time: {
            // start: GSTC.api.date().add(10, "day").startOf("day").valueOf(),
            // end: GSTC.api.date().add(12, "day").endOf("day").valueOf(),
          },
        },
        [GSTCID("5")]: {
          id: GSTCID("5"),
          rowId: GSTCID("4"),
          label: itemLabelContent,
          resizableFrom: GSTC.api.date().startOf("day").valueOf(),
          resizableTo: GSTC.api.date().add(14, "day").endOf("day").valueOf(),
          time: {
            start: GSTC.api.date().add(12, "day").startOf("day").valueOf(),
            end: GSTC.api.date().add(14, "day").endOf("day").valueOf(),
          },
        },
      },
      grid: {
        cell: {
          onCreate: [addCellBackground],
        },
      },
      time: {
        from: GSTC.api.date().valueOf(),
        to: GSTC.api.date().add(14, "day").endOf("day").valueOf(),
      },
    },
    locale: {
      name: "zh",
      weekdays: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
      months: [
        "一月",
        "二月",
        "三月",
        "四月",
        "五月",
        "六月",
        "七月",
        "八月",
        "九月",
        "十月",
        "十一月",
        "十二月",
      ],
    },
    actions: {},
    scroll: {
      vertical: { precise: false },
    },
    plugins: [
      TimelinePointer({}),
      Selection({
        events: {
          // @ts-ignore
          onStart(lastSelected) {
            // we can clear selection each time we start to prevent shift+select multiple cells
            // gstc.api.plugins.selection.selectCells([]);
            console.log("selecting start");
          },
          // @ts-ignore
          onSelecting(selecting, lastSelected) {
            const filtered = preventSelection(selecting);
            console.log(
              "Selecting cells",
              filtered["chart-timeline-grid-row-cell"]
            );
            console.log(
              "Selecting items",
              filtered["chart-timeline-items-row-item"]
            );
            return filtered;
          },
          // @ts-ignore
          onEnd(selected, lastSelected) {
            const filtered = preventSelection(selected);
            console.log(
              "Selected cells",
              filtered["chart-timeline-grid-row-cell"]
            );
            console.log(
              "Selected items",
              filtered["chart-timeline-items-row-item"]
            );
            return filtered;
          },
        },
      }),
      ItemMovement(movementPluginConfig),
      ItemResizing({
        events: {
          onStart({ items }) {
            console.log("Resizing start", items.after);
            return items.after;
          },
          onResize({ items }) {
            const filtered = items.after
              .map((item, index) => {
                if (!isItemResizable(item)) {
                  return items.before[index];
                }
                return item;
              })
              .map((item, index) => limitTime(item, items.before[index]))
              .map((item) => snapToTimeSeparately(item));
            return filtered;
          },
          onEnd({ items }) {
            console.log("Resizing done", items.after);
            return items.after;
          },
        },
        snapToTime: {
          start({ startTime }) {
            // reset default period snapping behavior
            // if you want custom snapping for all items out of the box - you can do it here
            // like: return startTime.startOf('day').add(8,'hour');
            return startTime;
          },
          end({ endTime }) {
            // reset default period snapping behavior
            return endTime;
          },
        },
      }),
    ],
  });

  let subs = [];

  const onLoad = (gstc) => {
    gstc.state.update("config.chart.items." + GSTCID("1"), (item1) => {
      // item1.label = 'Gantt schedule timeline calendar';
      // item1.time.start = GSTC.api
      //   .date(item1.time.start)
      //   .add(3, "day")
      //   .valueOf();
      // item1.time.end = GSTC.api.date(item1.time.end).add(4, "day").valueOf();
      return item1;
    });
    subs.push(
      gstc.state.subscribe("config.chart.items", (items) => {
        // console.log("items changed", items);
      })
    );
    subs.push(
      gstc.state.subscribe("config.list.rows", (rows) => {
        // console.log("rows changed", rows);
      })
    );
    // setTimeout(() => {
    //   gstc.state.update('config.list.rows.' + GSTCID('1'), (row) => {
    //     row.label = 'label changed dynamically';
    //     return row;
    //   });
    // }, 2000);
  };

  useEffect(() => {
    return () => {
      subs.forEach((unsub) => unsub());
    };
  });

  return (
    <div className="App">
      <GSTCComponent config={config} onLoad={onLoad} />
    </div>
  );
};

export default App;
