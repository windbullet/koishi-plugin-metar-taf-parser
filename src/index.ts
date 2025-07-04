import { Context, Schema } from 'koishi'

export const name = 'metar-taf-parser'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.command('metar-taf-parse <metar:text>', '解析METAR或TAF报文')
    .alias("气象报文解析")
    .action(({ session }, metar) => {
      var op_text = "";

      function add_output(text) {
        op_text = op_text + text;
      }

      function is_num_digit(ch) {
        return ((ch == '0') || (ch == '1') || (ch == '2') || (ch == '3') ||
          (ch == '4') || (ch == '5') || (ch == '6') || (ch == '7') ||
          (ch == '8') || (ch == '9'));
      }

      function decode_token(token) {
        // Check if token is "calm wind"
        if ((token == "00000KT") || (token == "00000MPS") || (token == "00000KMH")) {
          add_output("地面风： 静风<br>");
          return;
        }

        // Check if token is Wind indication
        var reWindKT = /^(\d{3}|VRB)(\d{2,3})(G\d{2,3})?(KT|MPS|KMH)$/;
        if (reWindKT.test(token)) {
          // Wind token: dddss(s){Gss(s)}KT -- ddd is true direction, ss(s) speed in knots
          var myArray = reWindKT.exec(token);
          var units = myArray[4];
          add_output("地面风： ");
          if (myArray[1] == "VRB")
            add_output(" 风向不定 ");
          else
            add_output(" 风向 " + myArray[1] + " 度");
          add_output(" 风速 " + parseInt(myArray[2], 10));
          var wspd = (1852 / 3600 * parseInt(myArray[2], 10)).toFixed(1);
          if (units == "KT") add_output(" 节 (约 " + wspd + " 米每秒)");
          else if (units == "KMH") add_output(" 公里每小时");
          else if (units == "MPS") add_output(" 米每秒");
          if (myArray[3] != null) {
            if (myArray[3] != "") {
              add_output(" 阵风 " + parseInt(myArray[3].substr(1, myArray[3].length), 10));
              wspd = (1852 / 3600 * parseInt(myArray[3].substr(1, myArray[3].length), 10)).toFixed(1);
              if (units == "KT") add_output(" 节 (约 " + wspd + " m/s)");
              else if (units == "KMH") add_output(" 公里每小时");
              else if (units == "MPS") add_output(" 米每秒");
            }
          }

          add_output("<br>"); return;
        }

        // Check if token is "variable wind direction"
        var reVariableWind = /^(\d{3})V(\d{3})$/;
        if (reVariableWind.test(token)) {
          // Variable wind direction: aaaVbbb, aaa and bbb are directions in clockwise order
          add_output("风向变化范围： 从 " + token.substr(0, 3) + " 度 到 " + token.substr(4, 3) + " 度<br>");
          return;
        }

        // Check if token is visibility
        var reVis = /^(\d{4})(N|S)?(E|W)?$/;
        if (reVis.test(token)) {
          var myArray = reVis.exec(token);
          add_output("能见度： ");
          if (myArray[1] == "9999")
            add_output(" 大于10公里 ");
          else if (myArray[1] == "0000")
            add_output(" 小于50米 ");
          else
            add_output(parseInt(myArray[1], 10) + " 米");

          var dir = "";
          if (typeof (myArray[2]) != "undefined") {
            dir = dir + myArray[2];
          }
          if (typeof (myArray[3]) != "undefined") {
            dir = dir + myArray[3];
          }
          if (dir != "") {
            add_output(" 方向 ");
            if (dir == "N") add_output("北");
            else if (dir == "NE") add_output("东北");
            else if (dir == "E") add_output("东");
            else if (dir == "SE") add_output("东南");
            else if (dir == "S") add_output("南");
            else if (dir == "SW") add_output("西南");
            else if (dir == "W") add_output("西");
            else if (dir == "NW") add_output("西北");
          }
          add_output("<br>"); return;
        }

        // Check if token is Statute-Miles visibility
        var reVisUS = /^(P)?(\d?(?:\/)?\d?)(SM)$/;
        if (reVisUS.test(token)) {
          add_output("能见度： ");
          var myArray = reVisUS.exec(token);
          if (myArray[1] == "P") add_output("大于 ");
          //var myVisArray = token.split("S");
          add_output(myArray[2]);
          add_output(" 英里 ");
          add_output("(约 " + (0.3048 * 5.28 * eval(myArray[2])).toFixed(2) + " 公里)<br>");
        }

        // Check if token is QNH indication in mmHg or hPa
        var reQNHhPa = /Q\d{3,4}/;
        if (reQNHhPa.test(token)) {
          // QNH token: Qpppp -- pppp is pressure hPa 
          add_output("修正海压： ");
          add_output(parseInt(token.substr(1, 4), 10) + " 毫巴 (约 ");
          add_output((76000 / (101325 * 25.4) * parseInt(token.substr(1, 4), 10)).toFixed(2));
          add_output(" 英寸汞柱)<br>"); return;
        }
        var reQNHhPa = /QNH\d{3,4}INS?$/;
        if (reQNHhPa.test(token)) {
          // QNH token: Qpppp -- pppp is pressure hPa 
          add_output("修正海压： ");
          add_output(parseInt(token.substr(3, 4), 10) + " 英寸汞柱 (约 ");
          add_output(Math.round((25.4 * 101325) / 7600000 * parseInt(token.substr(3, 4), 10)));
          add_output(" 毫巴)<br>"); return;
        }

        // Check if token is QNH indication in mmHg: Annnn
        var reINHg = /A\d{4}/;
        if (reINHg.test(token)) {
          add_output("修正海压： ");
          add_output(token.substr(1, 2) + "." + token.substr(3, 4) + " 英寸汞柱 (约 ");
          add_output(Math.round((25.4 * 101325) / 7600000 * parseInt(token.substr(1, 4), 10)));
          add_output(" 毫巴)<br>"); return;
        }

        // Check if token is runway visual range (RVR) indication
        var reRVR = /^R(\d{2})(R|C|L)?\/(M|P)?(\d{4})(V\d{4})?(U|D|N)?$/;
        if (reRVR.test(token)) {
          var myArray = reRVR.exec(token);
          add_output("跑道： ");
          add_output(myArray[1]);
          if (typeof (myArray[2]) != "undefined") {
            if (myArray[2] == "L") add_output(" 左");
            else if (myArray[2] == "R") add_output(" 右");
            else if (myArray[2] == "C") add_output(" 中");
          }
          add_output(" 接地区视程 ");
          if (myArray[5]) {
            // Variable range
            add_output(" 从 ");
            if (myArray[3] == "P") add_output("大于 ");
            else if (myArray[3] == "M") add_output("小于 ");
            add_output(myArray[4]);
            add_output(" 米");
            add_output(" 到 " + myArray[5].substr(1, myArray[5].length) + " 米");
          }
          else {
            // Single value
            if ((typeof (myArray[3]) != "undefined") &&
              (typeof (myArray[4]) != "undefined")) {
              if (myArray[3] == "P") add_output("大于 ");
              else if (myArray[3] == "M") add_output("小于 ");
              add_output(myArray[4]);
              add_output(" 米");
            }
          }
          if ((myArray.length > 5) && (typeof (myArray[6]) != "undefined")) {
            if (myArray[6] == "U") add_output(" 逐渐增加");
            else if (myArray[6] == "D") add_output(" 逐渐减少");
          }
          add_output("<br>");
          return;
        }

        // Check if token is CAVOK
        if (token == "CAVOK") {
          add_output("[天气状况良好]<br>");
          return;
        }

        // Check if token is NOSIG
        if (token == "NOSIG") {
          add_output("[无显著变化]<br>");
          return;
        }

        // Check if token is a present weather code
        var reWX = /^(\-|\+)?(VC)?(MI|BC|DR|BL|SH|TS|FZ|PR)?(DZ|RA|SN|SG|IC|PL|GR|GS)?(DZ|RA|SN|SG|IC|PL|GR|GS)?(DZ|RA|SN|SG|IC|PL|GR|GS)?(DZ|RA|SN|SG|IC|PL|GR|GS)?(SH|TS|DZ|RA|SN|SG|IC|PL|GR|GS|BR|FG|FU|VA|DU|SA|HZ|PO|SQ|FC|SS|DS)$/;
        if (reWX.test(token)) {
          add_output("天气： ");
          var myArray = reWX.exec(token);
          for (var i = 1; i < myArray.length; i++) {
            if (myArray[i] == "-") add_output("小 ");
            if (myArray[i] == "+") add_output("大 ");
            if (myArray[i] == "VC") add_output("附近的 ");
            if (myArray[i] == "MI") add_output("浅的 ");
            if (myArray[i] == "BC") add_output("散的 ");
            if (myArray[i] == "SH") add_output("阵 ");
            if (myArray[i] == "TS") add_output("雷暴 ");
            if (myArray[i] == "FZ") add_output("冰冻的 ");
            if (myArray[i] == "PR") add_output("部分的 ");
            if (myArray[i] == "DZ") add_output("毛毛雨 ");
            if (myArray[i] == "RA") add_output("雨 ");
            if (myArray[i] == "SN") add_output("雪 ");
            if (myArray[i] == "SG") add_output("米雪 ");
            if (myArray[i] == "IC") add_output("冰晶 ");
            if (myArray[i] == "PL") add_output("冰粒 ");
            if (myArray[i] == "GR") add_output("冰雹 ");
            if (myArray[i] == "GS") add_output("小冰雹 ");
            if (myArray[i] == "BR") add_output("轻雾 ");
            if (myArray[i] == "FG") add_output("雾 ");
            if (myArray[i] == "FU") add_output("烟 ");
            if (myArray[i] == "VA") add_output("火山灰 ");
            if (myArray[i] == "DU") add_output("扬尘 ");
            if (myArray[i] == "SA") add_output("沙 ");
            if (myArray[i] == "HZ") add_output("霾 ");
            if (myArray[i] == "PO") add_output("沙尘卷 ");
            if (myArray[i] == "SQ") add_output("暴风 ");
            if (myArray[i] == "FC") add_output("漏斗云 ");
            if (myArray[i] == "SS") add_output("沙暴 ");
            if (myArray[i] == "DS") add_output("尘暴 ");
            if (myArray[i] == "DR") add_output("飘动的 ");
            if (myArray[i] == "BL") add_output("风吹的 ");
          }
          add_output("<BR>"); return;
        }

        // Check if token is recent weather observation
        var reREWX = /^RE(\-|\+)?(VC)?(MI|BC|BL|DR|SH|TS|FZ|PR)?(DZ|RA|SN|SG|IC|PL|GR|GS)?(DZ|RA|SN|SG|IC|PL|GR|GS)?(DZ|RA|SN|SG|IC|PL|GR|GS)?(DZ|RA|SN|SG|IC|PL|GR|GS)?(SH|TS|DZ|RA|SN|SG|IC|PL|GR|GS|BR|FG|FU|VA|DU|SA|HZ|PO|SQ|FC|SS|DS)?$/;
        if (reREWX.test(token)) {
          add_output("天气： (从上一份报告到此报告之前 曾经出现) ");
          var myArray = reREWX.exec(token);
          for (var i = 1; i < myArray.length; i++) {
            if (myArray[i] == "-") add_output("小 ");
            if (myArray[i] == "+") add_output("大 ");
            if (myArray[i] == "VC") add_output("附近的 ");
            if (myArray[i] == "MI") add_output("浅的 ");
            if (myArray[i] == "BC") add_output("散的 ");
            if (myArray[i] == "SH") add_output("阵 ");
            if (myArray[i] == "TS") add_output("雷暴 ");
            if (myArray[i] == "FZ") add_output("冰冻的 ");
            if (myArray[i] == "PR") add_output("部分的 ");
            if (myArray[i] == "DZ") add_output("毛毛雨 ");
            if (myArray[i] == "RA") add_output("雨 ");
            if (myArray[i] == "SN") add_output("雪 ");
            if (myArray[i] == "SG") add_output("米雪 ");
            if (myArray[i] == "IC") add_output("冰晶 ");
            if (myArray[i] == "PL") add_output("冰粒 ");
            if (myArray[i] == "GR") add_output("冰雹 ");
            if (myArray[i] == "GS") add_output("小冰雹 ");
            if (myArray[i] == "BR") add_output("轻雾 ");
            if (myArray[i] == "FG") add_output("雾 ");
            if (myArray[i] == "FU") add_output("烟 ");
            if (myArray[i] == "VA") add_output("火山灰 ");
            if (myArray[i] == "DU") add_output("扬尘 ");
            if (myArray[i] == "SA") add_output("沙 ");
            if (myArray[i] == "HZ") add_output("霾 ");
            if (myArray[i] == "PO") add_output("沙尘卷 ");
            if (myArray[i] == "SQ") add_output("暴风 ");
            if (myArray[i] == "FC") add_output("漏斗云 ");
            if (myArray[i] == "SS") add_output("沙暴 ");
            if (myArray[i] == "DS") add_output("尘暴 ");
            if (myArray[i] == "DR") add_output("飘动的 ");
            if (myArray[i] == "BL") add_output("风吹的 ");
          }
          add_output("<br>"); return;
        }

        // Check if token is temperature / dewpoint pair
        var reTempDew = /^(M?\d\d|\/\/)\/(M?\d\d)?$/;
        if (reTempDew.test(token)) {
          var myArray = reTempDew.exec(token);
          var air_temp = null;
          var dew_point = null;

          if (myArray[1].charAt(0) == 'M') {
            add_output("温度： 零下 " + myArray[1].substr(1, 2) + " 摄氏度<br>");
            air_temp = (0 - parseInt(myArray[1].substr(1, 2), 10));
          }
          else {
            add_output("温度： " + myArray[1].substr(0, 2) + " 摄氏度<br>");
            air_temp = parseInt(myArray[1].substr(0, 2), 10);
          }

          if (myArray[2] != "") {
            if (myArray[2].charAt(0) == 'M') {
              add_output("露点： 零下 " + myArray[2].substr(1, 2) + " 摄氏度<br>");
              dew_point = (0 - parseInt(myArray[2].substr(1, 2), 10));
            }
            else {
              add_output("露点： " + myArray[2].substr(0, 2) + " 摄氏度<br>");
              dew_point = parseInt(myArray[2].substr(0, 2), 10);
            }
          }

          add_output("相对湿度： " + calcRH(air_temp, dew_point) + "%<br>");

          return;
        }

        // Check if token is "sky clear" indication
        if (token == "SKC") {
          add_output("【晴空】<br>");
          return;
        }

        // Check if token is "vertical visibility" indication
        var reVV = /^VV(\d{3}|\/{3})$/;
        if (reVV.test(token)) {
          // VVddd -- ddd is vertical distance, or /// if unspecified
          var myArray = reVV.exec(token);
          add_output("垂直能见度： ");
          if (myArray[1] == "///") {
            add_output(" 天空被遮蔽<br>");
          }
          else {
            add_output((100 * parseInt(myArray[1], 10)) + " 英尺");
            add_output(" (约 " + Math.round(30.48 * parseInt(myArray[1], 10)) + " 米)<br>");
          }

          return;
        }

        // Check if token is cloud indication
        var reCloud = /^(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?$/;
        if (reCloud.test(token)) {
          // Clouds: aaadddkk -- aaa indicates amount of sky covered, ddd distance over
          //                     aerodrome level, and kk the type of cloud.
          var myArray = reCloud.exec(token);
          add_output("云层： ");
          if (myArray[1] == "FEW") add_output("少云 (1 到 2 分云)");
          else if (myArray[1] == "SCT") add_output("疏云 (3 到 4 分云)");
          else if (myArray[1] == "BKN") add_output("多云 (5 到 7 分云)");
          else if (myArray[1] == "OVC") add_output("满天云 (8 分云)");

          add_output(" 云底高 " + (100 * parseInt(myArray[2], 10)) + " 英尺");
          add_output(" (约 " + Math.round(30.48 * parseInt(myArray[2], 10)) + " 米)");

          if (myArray[3] == "CB") add_output(" 积雨云");
          else if (myArray[3] == "TCU") add_output(" 塔状积云");

          add_output("<br>"); return;
        }

        // Check if token is part of a wind-shear indication
        var reRWY = /^RWY(\d{2})(L|C|R)?$/;
        if (token == "WS") { add_output("风切变： "); return; }
        else if (token == "ALL") { add_output("所有 "); return; }
        else if (token == "RWY") { add_output("跑道<br>"); return; }
        else if (reRWY.test(token)) {
          var myArray = reRWY.exec(token);
          add_output("跑道 " + myArray[1]);
          if (myArray[2] == "L") add_output(" 左");
          else if (myArray[2] == "C") add_output(" 中");
          else if (myArray[2] == "R") add_output(" 右");
          add_output("<br>");
          return;
        }

        // Check if token is no-significant-weather indication
        if (token == "NSW") {
          add_output("【无特别天气】<br>");
          return;
        }

        // Check if token is no-significant-clouds indication
        if (token == "NSC") {
          add_output("【无特别云层】<br>");
          return;
        }

        // 增强趋势指示解析 - 支持更多格式
        // BECMG组 - 天气逐渐变化
        if (token.startsWith("BECMG")) {
          add_output("<br>【天气逐渐转变】<br>");
          
          // 支持 BECMG TLhhmm 格式
          var reBECMG_TL = /^BECMGTL(\d{2})(\d{2})$/;
          if (reBECMG_TL.test(token)) {
            var myArray = reBECMG_TL.exec(token);
            add_output("预计到 " + myArray[1] + ":" + myArray[2] + " UTC ");
            add_output(reLocaleTime(myArray[1], myArray[2]) + " 完成转变<br>");
            return;
          }
          
          // 支持 BECMG FMhhmm 格式
          var reBECMG_FM = /^BECMGFM(\d{2})(\d{2})$/;
          if (reBECMG_FM.test(token)) {
            var myArray = reBECMG_FM.exec(token);
            add_output("预计从 " + myArray[1] + ":" + myArray[2] + " UTC ");
            add_output(reLocaleTime(myArray[1], myArray[2]) + " 开始转变<br>");
            return;
          }
          
          // 默认输出
          add_output("(具体时间未指定)<br>");
          return;
        }
        
        // TEMPO组 - 天气短时变化
        if (token.startsWith("TEMPO")) {
          add_output("<br>【天气短时转变】<br>");
          
          // 支持 TEMPO TLhhmm 格式
          var reTEMPO_TL = /^TEMPOTL(\d{2})(\d{2})$/;
          if (reTEMPO_TL.test(token)) {
            var myArray = reTEMPO_TL.exec(token);
            add_output("预计到 " + myArray[1] + ":" + myArray[2] + " UTC ");
            add_output(reLocaleTime(myArray[1], myArray[2]) + " 完成转变<br>");
            return;
          }
          
          // 支持 TEMPO FMhhmm 格式
          var reTEMPO_FM = /^TEMPOFM(\d{2})(\d{2})$/;
          if (reTEMPO_FM.test(token)) {
            var myArray = reTEMPO_FM.exec(token);
            add_output("预计从 " + myArray[1] + ":" + myArray[2] + " UTC ");
            add_output(reLocaleTime(myArray[1], myArray[2]) + " 开始转变<br>");
            return;
          }
          
          // 默认输出
          add_output("(具体时间未指定)<br>");
          return;
        }
        
        // 单独解析 TL 组 - 变化持续到指定时间
        var reTL = /^TL(\d{2})(\d{2})Z?$/;
        if (reTL.test(token)) {
          var myArray = reTL.exec(token);
          add_output("▲到 " + myArray[1] + ":" + myArray[2] + " UTC ");
          add_output(reLocaleTime(myArray[1], myArray[2]) + " 转变为： <br>");
          return;
        }
        
        // 单独解析 FM 组 - 从指定时间开始变化
        var reFM = /^FM(\d{2})(\d{2})Z?$/;
        if (reFM.test(token)) {
          var myArray = reFM.exec(token);
          add_output("▲从 " + myArray[1] + ":" + myArray[2] + " UTC ");
          add_output(reLocaleTime(myArray[1], myArray[2]) + " 转变为： <br>");
          return;
        }
        
        // 单独解析 AT 组 - 在指定时间发生变化
        var reAT = /^AT(\d{2})(\d{2})Z?$/;
        if (reAT.test(token)) {
          var myArray = reAT.exec(token);
          add_output("<br>▲在 " + myArray[1] + ":" + myArray[2] + " UTC ");
          add_output(reLocaleTime(myArray[1], myArray[2]) + " 转变为： <br>");
          return;
        }

        // Check if item is runway state group
        var reRSG = /^(\d\d)(\d|C|\/)(\d|L|\/)(\d\d|RD|\/)(\d\d)$/;
        if (reRSG.test(token)) {
          var myArray = reRSG.exec(token);
          add_output("跑道状态： ");

          // Runway designator (first 2 digits)
          var r = parseInt(myArray[1], 10);
          if (r < 50) add_output(" 跑道 " + myArray[1] + " (或 " + myArray[1] + " 左) ");
          else if (r < 88) add_output(" 跑道 " + (r - 50) + " 右 ");
          else if (r == 88) add_output(" 所有跑道 ");

          // Check if "CLRD" occurs in digits 3-6
          if (token.substr(2, 4) == "CLRD") add_output(" 恢复使用 ");
          else {
            // Runway deposits (third digit)
            if (myArray[2] == "0") add_output("干 ");
            else if (myArray[2] == "1") add_output("潮湿 ");
            else if (myArray[2] == "2") add_output("积水 ");
            else if (myArray[2] == "3") add_output("结霜 ");
            else if (myArray[2] == "4") add_output("干雪 ");
            else if (myArray[2] == "5") add_output("湿雪 ");
            else if (myArray[2] == "6") add_output("融雪 ");
            else if (myArray[2] == "7") add_output("结冰 ");
            else if (myArray[2] == "8") add_output("结实的雪 ");
            else if (myArray[2] == "9") add_output("雪槽 ");
            else if (myArray[2] == "/") add_output("障碍物 未知 ");

            // Extent of runway contamination (fourth digit)
            if (myArray[3] == "1") add_output("覆盖范围 小于10% ");
            else if (myArray[3] == "2") add_output("覆盖范围 11% 到 25% ");
            else if (myArray[3] == "5") add_output("覆盖范围 26% 到 50% ");
            else if (myArray[3] == "9") add_output("覆盖范围 51% 到 100% ");
            else if (myArray[3] == "/") add_output("覆盖范围 未知/清除中 ");

            // Depth of deposit (fifth and sixth digits)
            if (myArray[4] == "//") add_output("障碍深度 未知 ");
            else {
              var d = parseInt(myArray[4], 10);
              if (d == 0) add_output("障碍深度 小于 1 mm ");
              else if ((d > 0) && (d < 91)) add_output("障碍深度 " + d + " mm ");
              else if (d == 92) add_output("障碍深度 10 cm ");
              else if (d == 93) add_output("障碍深度 15 cm ");
              else if (d == 94) add_output("障碍深度 20 cm ");
              else if (d == 95) add_output("障碍深度 25 cm ");
              else if (d == 96) add_output("障碍深度 30 cm ");
              else if (d == 97) add_output("障碍深度 35 cm ");
              else if (d == 98) add_output("障碍深度 40 cm 或更深 ");
              else if (d == 99) add_output("积雪清除中 ");
            }
          }

          // Friction coefficient or braking action (seventh and eighth digit)
          if (myArray[5] == "//") add_output("摩擦系数 未知 ");
          else {
            var b = parseInt(myArray[5], 10);
            if (b < 91) add_output("摩擦系数 0." + myArray[5]);
            else {
              if (b == 91) add_output("制动效果 弱");
              else if (b == 92) add_output("制动效果 中/弱");
              else if (b == 93) add_output("制动效果 中");
              else if (b == 94) add_output("制动效果  中/强");
              else if (b == 95) add_output("制动效果 强");
              else if (b == 99) add_output("制动效果 无法确定");
            }
          }
          add_output("<br>"); return;
        }

        if (token == "SNOCLO") {
          add_output("【跑道积雪，机场关闭】<br>");
          return;
        }

        // Check if item is sea status indication
        var reSea = /^W(M)?(\d\d)\/S(\d)/;
        if (reSea.test(token)) {
          var myArray = reSea.exec(token);
          add_output("海面温度： ");
          if (myArray[1] == "M")
            add_output(" 零下 ");
          add_output(parseInt(myArray[2], 10) + " 摄氏度<br>");

          add_output("浪高： ");
          if (myArray[3] == "0") add_output("0 m <br>");
          else if (myArray[3] == "1") add_output("0-0.1 米<br>");
          else if (myArray[3] == "2") add_output("0.1-0.5 米<br>");
          else if (myArray[3] == "3") add_output("0.5-1.25 米<br>");
          else if (myArray[3] == "4") add_output("1.25-2.5 米<br>");
          else if (myArray[3] == "5") add_output("2.5-4 米<br>");
          else if (myArray[3] == "6") add_output("4-6 米<br>");
          else if (myArray[3] == "7") add_output("6-9 米<br>");
          else if (myArray[3] == "8") add_output("9-14 米<br>");
          else if (myArray[3] == "9") add_output("大于 14 米<br>");
          return;
        }

        // Check if item is Valid period indication
        var reValidPeriod = /^(\d{2})(\d{2})\/(\d{2})(\d{2})$/;
        if (reValidPeriod.test(token)) {
          var myArray = reValidPeriod.exec(token);
          add_output("有效期： 从 " + myArray[1] + " 日 ");
          add_output(myArray[2] + ":00 UTC " + reLocaleTime(myArray[2], "00") + " 到 ");
          //if (parseInt(myArray[2],10)-parseInt(myArray[3],10)>=0) add_output(" 次日 ");
          add_output(myArray[3] + " 日 " + myArray[4] + ":00 UTC " + reLocaleTime(myArray[4], "00") + "<br>");
          return;
        }

        // Check if item is probability indication
        var reProb = /^PROB(\d{2})$/;
        if (reProb.test(token)) {
          var myArray = reProb.exec(token);
          add_output("<br>☆以下天气预计有 " + myArray[1] + "% 的可能性会出现： <br>");
          return;
        }

        // Check if item is temperature indication
        var reTempMM = /^T(N|X)(\d{2})\/(\d{4})Z$/;
        if (reTempMM.test(token)) {
            var myArray = reTempMM.exec(token);
            add_output("气温： ");
            var day = myArray[3].substring(0, 2);
            var hour = myArray[3].substring(2, 4);
            if (myArray[1] == "X") {
                add_output("最高 " + myArray[2] + " 摄氏度 大约出现在 ");
                add_output(day + "日" + hour + ":00 UTC " + reLocaleTime(hour, "00") + "<br>");
            }
            else if (myArray[1] == "N") {
                add_output("最低 " + myArray[2] + " 摄氏度 大约出现在 ");
                add_output(day + "日" + hour + ":00 UTC " + reLocaleTime(hour, "00") + "<br>");
            }
            return;
        }
      }

      function metar_decode(text) {
        op_text = "";
        //alert(text);

        // Join newline-separated pieces...
        //    var newlineJoined = text.replace(/\n/, " ");
        var newlineJoined = text.replace(/(\x0d\x0a)|\x0D|\x0A/, " ");
        newlineJoined = newlineJoined.replace(/(\x20)+/g, " ");
        
        // 改进趋势组处理 - 支持BECMG TL/FM格式
        newlineJoined = newlineJoined.replace(/BECMG TL/g, "BECMGTL");
        newlineJoined = newlineJoined.replace(/BECMG FM/g, "BECMGFM");
        newlineJoined = newlineJoined.replace(/TEMPO TL/g, "TEMPOTL");
        newlineJoined = newlineJoined.replace(/TEMPO FM/g, "TEMPOTFM");

        //alert(newlineJoined);

        // An '=' finishes the report
        var equalPosition = newlineJoined.indexOf("=");
        if (equalPosition > -1) {
          newlineJoined = newlineJoined.substr(0, equalPosition);
        }

        var arrayOfTokens;
        arrayOfTokens = newlineJoined.split(" ");
        var numToken = 0;

        // 增强报文类型识别
        var reportType = "";
        if (arrayOfTokens[numToken] == "METAR") {
          reportType = "METAR";
          add_output("【例行天气报告】<br>");
          numToken++;
        }
        else if (arrayOfTokens[numToken] == "SPECI") {
          reportType = "SPECI";
          add_output("【特选天气报告】<br>");
          numToken++;
        }
        else if (arrayOfTokens[numToken] == "TAF") {
          reportType = "TAF";
          add_output("【机场天气预报】<br>");
          numToken++;
          if (arrayOfTokens[numToken] == "AMD") {
            add_output("【修正报告】<br>");
            numToken++;
          }
        }

        // Parse location token
        if (arrayOfTokens[numToken].length == 4) {
          add_output("机场： " + arrayOfTokens[numToken] + "<br>");
          numToken++;
        }
        else {
          //add_output("格式错误： '" + arrayOfTokens[numToken] + "' 机场代码应为4个字母");
          add_output("当前联飞系统无该机场的气象报文");
          return op_text;
        }

        // Parse date-time token -- we allow time specifications without final 'Z'
        if ((
          ((arrayOfTokens[numToken].length == 7) &&
            (arrayOfTokens[numToken].charAt(6) == 'Z')) ||
          (arrayOfTokens[numToken].length == 6)
        ) &&
          is_num_digit(arrayOfTokens[numToken].charAt(0)) &&
          is_num_digit(arrayOfTokens[numToken].charAt(1)) &&
          is_num_digit(arrayOfTokens[numToken].charAt(2)) &&
          is_num_digit(arrayOfTokens[numToken].charAt(3)) &&
          is_num_digit(arrayOfTokens[numToken].charAt(4)) &&
          is_num_digit(arrayOfTokens[numToken].charAt(5))) {
          add_output("日期： " + arrayOfTokens[numToken].substr(0, 2) + " 号<br>");
          add_output("时间： " + arrayOfTokens[numToken].substr(2, 2) + ":" +
            arrayOfTokens[numToken].substr(4, 2) + " UTC ");
          add_output(reLocaleTime(arrayOfTokens[numToken].substr(2, 2), arrayOfTokens[numToken].substr(4, 2)));

          if (arrayOfTokens[numToken].length == 6)
            add_output(" (时间格式未知)");

          add_output("<br>");
          numToken++;
        }
        else {
          add_output("时间格式不正确");
          return op_text;
        }

        // 针对TAF报文的特殊处理
        if (reportType === "TAF") {
          // 检查有效期
          var reValidPeriod = /^(\d{2})(\d{2})\/(\d{2})(\d{2})$/;
          if (reValidPeriod.test(arrayOfTokens[numToken])) {
            var myArray = reValidPeriod.exec(arrayOfTokens[numToken]);
            add_output("预报有效期： 从 " + myArray[1] + " 日 ");
            add_output(myArray[2] + ":00 UTC " + reLocaleTime(myArray[2], "00") + " 到 ");
            add_output(myArray[3] + " 日 " + myArray[4] + ":00 UTC " + reLocaleTime(myArray[4], "00") + "<br>");
            numToken++;
          }
        }

        // Check if "AUTO" or "COR" token comes next.
        if (arrayOfTokens[numToken] == "AUTO") {
          add_output("【报告由系统自动生成】<br>");
          numToken++;
        }
        else if (arrayOfTokens[numToken] == "COR") {
          add_output("【更正前一份报告】<br>");
          numToken++;
        }

        // Parse remaining tokens
        for (var i = numToken; i < arrayOfTokens.length; i++) {
          if (arrayOfTokens[i].length > 0) {
            decode_token(arrayOfTokens[i].toUpperCase());
          }
          else {
            add_output("");
          }
        }

        return op_text
      }

      //return the local time format
      function reLocaleTime(hours, minutes) {
        var ntime = new Date();
        ntime.setUTCHours(hours);
        ntime.setUTCMinutes(minutes);
        var nStr = ntime.toTimeString().split(/:/);
        var reStr = "(本地时间: " + nStr[0] + ":" + nStr[1] + ")";
        return reStr;
      }

      //calculate the Relative Humidity from Temperature and Dew Point
      function calcRH(airtemp, dewpoint) {
        var a_c = parseFloat(airtemp);//Air Temperature
        var b_c = parseFloat(dewpoint);//Dew Point
        var c = 6.11 * Math.pow(10, ((7.5 * a_c / (237.7 + a_c))));//saturation vapor pressure
        var d = 6.11 * Math.pow(10, ((7.5 * b_c / (237.7 + b_c))));//actual vapor pressure
        var e = (d / c) * 100;//relative humidity 
        e = ((Math.round(e * 100)) / 100);//calc percentage
        return e;
      }

      return metar_decode(metar).replaceAll("<br>", "\n");
    })
}
