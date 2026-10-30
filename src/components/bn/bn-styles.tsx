// Bozor Narxida — premium dizayn tizimi ("Tilla luxury").
//
// Barcha --bn-* tokenlar va umumiy BN klasslari (.bn-scope, .bn-stage, .bn-aurora,
// .bn-input ...) endi oddiy statik CSS'da: `bn-styles.css` (bn/layout.tsx import
// qiladi). Ilgari shu faylda "use client" + <style jsx global> edi — App Router'da
// registry'siz u faqat gidratsiyadan keyin qo'shilardi (birinchi kadr temasiz,
// vitrina sakrardi). Bu fayl server komponent — "use client" kerak emas.

/** Jonli gradient fon — sahifa ortida sekin harakatlanadi (issiq tilla orbitlar) */
export function BnAurora() {
    return (
        <div className="bn-aurora" aria-hidden="true">
            <span /><span /><span />
        </div>
    );
}
