import { gsap } from 'gsap';

/**
 * 指定したHTMLElementに対し、ボタンが押されたアニメーションを表示
 * @param id 対象となるHTMLElementのid
 */
export function pushButtunAnimation(id: string){
  gsap.to("#"+id, {
    backgroundColor: "black",
    duration: 0.1,
  });
}

/**
 * 指定したHTMLElementに対し、ボタンが離されたアニメーションを表示
 * @param id 対象となるHTMLElementのid
 */
export function releaseButtunAnimation(id: string) {
  gsap.to("#"+id, {
    backgroundColor: "white",
    duration: 0.1,
  });
}

/**
 * 指定したHTMLElementを指定した座標へ移動
 * @param id 対象となるHTMLElementのid
 * @param x x座標
 * @param y y座標
 */
export function moveStickHat(id: string, x: number, y: number) {
  gsap.to("#"+id,{
    x: x,
    y: y,
    duration: 0.1,
  });
}