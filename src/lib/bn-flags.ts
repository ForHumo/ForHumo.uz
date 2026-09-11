// BN launch-time feature flags — MChJ va integratsiyalar yetgunga qadar
// ba'zi funksiyalar yashirin qoladi. Har qanday funksiya ochilishi 1 ta
// o'zgaruvchi (yoki env) bilan boshqariladi — kod strukturasi tegilmaydi.
//
// Flag'ni true qilish oldida quyidagini ta'minlang:
//   - deliveryEnabled — Yandex Go Business API ulanishi
//   - fivePercentCommission — MChJ + real merchant hisob
//   - realWithdraw — Payme/Click merchant KYC (biz tarafda)

export const BN_FLAGS = {
    /** Xaridor Yetkazish (Delivery) variantini tanlashi mumkinmi.
     *  Hozir false — Yandex Delivery API integratsiyasi yo'q.
     *  Faqat PICKUP va INSPECT ishlaydi. */
    deliveryEnabled: false,

    /** BN sotuvchidan har buyurtmaga 5% komissiya olamizmi.
     *  Hozir false — biz "narx qo'yuvchi" bo'lishimiz kerak, sotuvchilar
     *  raqobat pastki narxga tortsin. Faza 3 (bozor raqamlashgach) yoqiladi. */
    fivePercentCommission: false,

    /** Pay Withdraw real ishlaydimi. Hozir test — MChJ + merchant hisob
     *  kelgach true qilinadi. Test rejim'da withdraw ko'rinadi lekin
     *  "yaqinda kelmoqda" belgisi bilan. */
    realWithdraw: false,
};

export type BnFlagKey = keyof typeof BN_FLAGS;
