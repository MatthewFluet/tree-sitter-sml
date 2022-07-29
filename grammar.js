// ******************************************************** //
// Extensions
// ******************************************************** //

const EXTENSIONS = true;

function ifExtElse(ext, resExt, resStd) {
    if (Array.isArray(EXTENSIONS)
        ? (Array.isArray(ext)
           ? ext.some((ext) => EXTENSIONS.includes(ext))
           : EXTENSIONS.includes(ext))
        : EXTENSIONS) {
        return resExt
    } else {
        return resStd
    }
}

function ifExtAlt(ext, resExt) {
    return ifExtElse(ext, resExt, choice())
}
function ifExtOpt(ext, resExt) {
    return ifExtElse(ext, optional(resExt), blank())
}

const optBar = ifExtOpt('optBar', token("|"));

// ******************************************************** //
// Regular Expressions for Constants
// ******************************************************** //

const decDigitRE = '[0-9]';
const decNumRE = ifExtElse(
    'extendedNumConst',
    `${decDigitRE}(_*${decDigitRE})*`,
    `${decDigitRE}+`
);
const hexDigitRE = '[A-Fa-f0-9]';
const hexNumRE = ifExtElse(
    'extendedNumConst',
    `${hexDigitRE}(_*${hexDigitRE})*`,
    `${hexDigitRE}+`
);
const binDigitRE = '[01]';
const binNumRE = ifExtElse(
    'extendedNumConst',
    `${binDigitRE}(_*${binDigitRE})*`,
    `${binDigitRE}+`
);
const integerConstRE = ifExtElse(
    'extendedNumConst',
    `~?${decNumRE}|~?0x${hexNumRE}|~?0b${binNumRE}`,
    `~?${decNumRE}|~?0x${hexNumRE}`,
);
const wordConstRE = ifExtElse(
    'extendedNumConst',
    `0w${decNumRE}|0wx${hexNumRE}|0wb${binNumRE}`,
    `0w${decNumRE}|0wx${hexNumRE}`,
);
const fracRE = `[.]${decNumRE}`;
const expRE = `[eE]~?${decNumRE}`;
const realConstRE = `~?${decNumRE}${fracRE}(?:${expRE})?|~?${decNumRE}(?:${fracRE})?${expRE}`;

// ******************************************************** //
// Regular Expressions Identifiers
// ******************************************************** //

const alphaNumericIdentSuffixRE = /[A-Za-z0-9_']*/.source;
const alphaAlphaNumericIdentRE = `[A-Za-z]${alphaNumericIdentSuffixRE}`;
const primeAlphaNumericIdentRE = `'${alphaNumericIdentSuffixRE}`;
const symbolicIdentRE = /[!%&$#+\-/:<=>?@\\~`^|*]+/.source;
const identRE = `(?:${alphaAlphaNumericIdentRE})|(?:${primeAlphaNumericIdentRE})|(?:${symbolicIdentRE})`;

// ******************************************************** //
// "Separated By"
// ******************************************************** //

const commaSep = {name: 'Comma', token: token(",")};
const semicolonSep = {name: 'Semicolon', token: token(";")};

function mkSepByAux(cnt, pre, sep, elt, pst) {
    if (cnt > 0) {
        return seq(
            pre ? sep : blank(),
            elt,
            mkSepByAux(cnt - 1, true, sep, elt, pst)
        )
    } else {
        if (pre) {
            if (pst) {
                return seq(repeat(seq(sep, elt)), pst(true))
            } else {
                return repeat(seq(sep, elt))
            }
        } else {
            if (pst) {
                return choice(pst(false), seq(elt, repeat(seq(sep, elt)), pst(true)))
            } else {
                return optional(seq(elt, repeat(seq(sep, elt))))
            }
        }
    }
}

function mkSepByCntFstLst(sep, elt, cnt, fst, lst) {
    let optSep = false, empSep = false;
    let preSep, pstSep;
    if (typeof sep === 'string') {
        preSep = blank();
        pstSep = blank();
    } else {
        if (ifExtElse('emp'.concat(sep.name), true, false)) {
            empSep = true;
            optSep = true;
        } else if (ifExtElse('opt'.concat(sep.name), true, false)) {
            optSep = true;
        }
        sep = sep.token;
        if (empSep) {
            sep = repeat1(sep);
        }
        if (optSep) {
            preSep = optional(sep);
            pstSep = optional(sep);
        } else {
            preSep = blank();
            pstSep = blank();
        }
    }

    let pst;
    if (lst) {
        pst = (pre) => {
            if (lst.rqd) {
                if (pre) {
                    return seq(sep, lst.elt, pstSep)
                } else {
                    return seq(lst.elt, pstSep)
                }
            } else {
                if (pre) {
                    return optional(seq(sep, lst.elt, pstSep))
                } else {
                    return optional(seq(lst.elt, pstSep))
                }
            }
        };
    } else if (optSep) {
        pst = (pre) => {
            if (pre) {
                return pstSep
            } else {
                return blank()
            }
        }
    } else {
        pst = false;
    };

    if (fst) {
        if (fst.rqd) {
            return seq(preSep, fst.elt, mkSepByAux(cnt, true, sep, elt, pst))
        } else {
            return choice(
                seq(preSep, fst.elt, mkSepByAux(cnt, true, sep, elt, pst)),
                seq(preSep, mkSepByAux(cnt, false, sep, elt, pst))
            )
        }
    } else {
        return seq(preSep, mkSepByAux(cnt, false, sep, elt, pst))
    };
}

function mkSepByCnt(sep, elt, cnt) {
    return mkSepByCntFstLst(sep, elt, cnt, false, false)
}

function mkSepBy(sep, elt, cnt) {
    return mkSepByCntFstLst(sep, elt, 0, false, false)
}

function mkSepBy1(sep, elt, cnt) {
    return mkSepByCntFstLst(sep, elt, 1, false, false)
}

function mkSepBy2(sep, elt, cnt) {
    return mkSepByCntFstLst(sep, elt, 2, false, false)
}

function mkBrakSepByCntFstLst(opn, sep, elt, cnt, fst, lst, cls) {
    return seq(opn, mkSepByCntFstLst(sep, elt, cnt, fst, lst), cls)
}

function mkBrakSepBy(opn, sep, elt, cls) {
    return seq(opn, mkSepBy(sep, elt), cls)
}

function mkBrakSepBy1(opn, sep, elt, cls) {
    return seq(opn, mkSepBy1(sep, elt), cls)
}

function mkSeqAux(clsSing, clsSep) {
    return choice(clsSing, mkBrakSepBy1("(", ",", clsSep, ")"))
}

function mkSeq(cls) {
    return mkSeqAux(cls, cls)
}

// ******************************************************** //
// Grammar
// ******************************************************** //

module.exports = grammar({
    name: 'sml',

    extras: $ => [
        token(/\s+/),
        $.block_comment,
        ...ifExtElse('lineComment', [$.line_comment], []),
    ],

    externals: $ => [
        $.block_comment,
        $.line_comment,
    ],

    inline: $ => [
    ],

    conflicts: $ => [
        [
            // Two tokens of lookahead required.
            $.wheretype_sigexp
        ],
    ],

    // word: $ => $._ident,

    rules: {
        source_file: $ => optional($._program),

        comment: $ => choice(
            $.block_comment,
            ifExtAlt('lineComment', $.line_comment),
        ),

        // ******************************************************** //
        // Special Constants
        // ******************************************************** //

        _scon: $ => choice(
            $.integer_scon,
            $.word_scon,
            $.real_scon,
            $.string_scon,
            $.char_scon,
        ),

        integer_scon: $ => token(new RegExp(integerConstRE)),
        word_scon: $ => token(new RegExp(wordConstRE)),
        real_scon: $ => token(new RegExp(realConstRE)),
        string_scon: $ => token(/"(?:[^"\\]|\\[^\s]|\\\s*\\)*"/m),
        char_scon: $ => token(/#"(?:[^"\\]|\\[^\s]|\\\s*\\)*"/m),

        // ******************************************************** //
        // Identifier Classes (Core)
        // ******************************************************** //

        _alphaAlphaNumeric_ident: $ => token(new RegExp(alphaAlphaNumericIdentRE)),
        _primeAlphaNumeric_ident: $ => token(new RegExp(primeAlphaNumericIdentRE)),
        _symbolic_ident: $ => token(new RegExp(symbolicIdentRE)),

        tyvar: $ => choice($._primeAlphaNumeric_ident),
        tyvarseq: $ => mkSeq($.tyvar),
        vid: $ => choice($._alphaAlphaNumeric_ident,$._symbolic_ident),
        longvid: $ => seq(repeat(seq($.strid, ".")), $.vid),
        tycon: $ => choice($._alphaAlphaNumeric_ident,$._symbolic_ident),
        longtycon: $ => seq(repeat(seq($.strid, ".")), $.tycon),
        lab: $ => choice($._alphaAlphaNumeric_ident,$._symbolic_ident,/[1-9][0-9]*/),

        // ******************************************************** //
        // Expressions and Matches (Core)
        // ******************************************************** //

        _atexp: $ => choice(
            $.scon_exp,
            $.vid_exp,
            $.record_exp,
            $.recordsel_exp,
            $.unit_exp,
            $.tuple_exp,
            $.list_exp,
            ifExtAlt('vectorExp', $.vec_exp),
            $.sequence_exp,
            $.let_exp,
            $.paren_exp,
        ),

        scon_exp: $ => $._scon,
        vid_exp: $ => seq(optional("op"), $.longvid),
        record_exp: $ => mkBrakSepByCntFstLst(
            "{",
            commaSep,
            $._exprow, 0,
            false,
            ifExtElse('recordExt', {elt: $.ellipsis_exprow, rqd: false}, false),
            "}"
        ),
        _exprow: $ => choice(
            $.exprow,
            ifExtAlt('recordExpPun', $.labvar_exprow),
        ),
        exprow: $ => seq($.lab, "=", $._exp),
        labvar_exprow: $ => seq($.vid, optional(seq(":", $._ty))),
        ellipsis_exprow: $ => seq("...", "=", $._exp),
        recordsel_exp: $ => seq("#", $.lab),
        unit_exp: $ => prec(1, seq("(", ")")),
        tuple_exp: $ => mkBrakSepBy("(", commaSep, $._exp, ")"),
        list_exp: $ => mkBrakSepByCntFstLst(
            "[",
            commaSep,
            $._exp, 0,
            false,
            ifExtElse('listEllipsis', {elt: $.ellipsis_listexp, rqd:false}, false),
            "]"
        ),
        ellipsis_listexp: $ => seq("...", "=", $._exp),
        vec_exp: $ => mkBrakSepBy("#[", commaSep, $._exp, "]"),
        sequence_exp: $ => mkBrakSepBy("(", semicolonSep, $._exp, ")"),
        let_exp: $ => seq(
            "let",
            field('decs', repeat(choice(";", $._dec))),
            "in",
            field('body', mkSepBy1(semicolonSep, $._exp)),
            "end"
        ),
        paren_exp: $ => prec(1, seq("(", $._exp, ")")),

        // The Definition orders by decreasing precedence
        _exp: $ => choice(
            $._atexp,
            $.app_exp,
            $.typed_exp,
            $.conj_exp,
            $.disj_exp,
            $.handle_exp,
            $.raise_exp,
            $.cond_exp,
            $.iter_exp,
            $.case_exp,
            $.fn_exp,
        ),

        app_exp: $ => prec(10, seq($._atexp, repeat1($._atexp))),
        typed_exp: $ => prec(09, seq($._exp, ":", $._ty)),
        conj_exp: $ => prec.left(08, seq($._exp, "andalso", $._exp)),
        disj_exp: $ => prec.left(07, seq($._exp, "orelse", $._exp)),
        handle_exp: $ => prec(06, seq($._exp, "handle", $._match)),
        raise_exp: $ => prec(05, seq("raise", $._exp)),
        cond_exp: $ => prec.right(04, seq(
            "if", $._exp,
            "then", $._exp,
            ifExtElse('optElse',
                      optional(seq("else", $._exp)),
                      seq("else", $._exp))
        )),
        iter_exp: $ => prec(03, seq("while", $._exp, "do", $._exp)),
        case_exp: $ => prec(02, seq("case", $._exp, "of", $._match)),
        fn_exp: $ => prec(01, seq("fn", $._match)),

        _match: $ => prec.right(seq(optBar, mkSepBy1("|", $.mrule))),
        mrule: $ => seq($._pat, "=>", $._exp),

        // ******************************************************** //
        // Declarations and Bindings (Core)
        // ******************************************************** //

        _dec: $ => choice(
            $._dec_no_local,
            $.local_dec,
        ),
        _dec_no_local: $ => choice(
            ifExtAlt('doDec', $.do_dec),
            $.val_dec,
            $.fun_dec,
            $.type_dec,
            $.datatype_dec,
            $.datarepl_dec,
            $.abstype_dec,
            $.exception_dec,
            // $.local_dec,
            $.open_dec,
            $.infix_dec,
            $.infixr_dec,
            $.nonfix_dec,
        ),

        do_dec: $ => seq("do", $._exp),

        val_dec: $ => seq(
            "val",
            optional("rec"),
            field('tyvars', optional($.tyvarseq)),
            $._valbind
        ),
        _valbind: $ => mkSepBy1("and", $.valbind),
        valbind: $ => seq($._pat, "=", $._exp),

        fun_dec: $ => seq(
            "fun",
            field('tyvars', optional($.tyvarseq)),
            $._fvalbind
        ),
        _fvalbind: $ => mkSepBy1("and", $.fvalbind),
        fvalbind: $ => $._fmatch,
        _fmatch: $ => seq(optBar, mkSepBy1("|", $.fmrule)),
        fmrule: $ => seq(
            choice(
                prec(2,seq(optional("op"), field('name', $.vid), field('args', repeat1($._atpat)))),
                prec(2,seq("(", field('argl', $._atpat), field('name', $.vid), field('argr', $._atpat), ")", field('args', repeat($._atpat)))),
                prec(0,seq(field('argl', $._atpat), field('name', $.vid), field('argr', $._atpat))),
            ),
            optional(seq(":", $._ty)),
            "=",
            field('body', $._exp)
        ),

        type_dec: $ => seq("type", $._typbind),
        _typbind: $ => mkSepBy1("and", $.typbind),
        typbind: $ => seq(
            field('tyvars', optional($.tyvarseq)),
            field('name', $.tycon),
            "=",
            field('def', $._ty)
        ),

        datatype_dec: $ => seq(
            "datatype",
            $._datbind,
            optional(field('withtype', seq("withtype", $._typbind)))
        ),
        _datbind: $ => mkSepBy1("and", $.datbind),
        datbind: $ => seq(
            field('tyvars', optional($.tyvarseq)),
            field('name', $.tycon),
            "=",
            $._conbind
        ),
        _conbind: $ => seq(optBar, mkSepBy1("|", $.conbind)),
        conbind: $ => seq(
            field('name', seq(optional("op"), $.vid)),
            optional(seq("of", field('ty', $._ty)))
        ),

        datarepl_dec: $ => seq(
            "datatype",
            field('name', $.tycon),
            "=",
            "datatype",
            field('def', $.longtycon)
        ),

        abstype_dec: $ => seq(
            "abstype",
            $._datbind,
            optional(field('withtype', seq("withtype", $._typbind))),
            "with",
            field('decs', repeat(choice(";", $._dec))),
            "end"
        ),

        exception_dec: $ => seq("exception", $._exbind),
        _exbind: $ => mkSepBy1("and", $.exbind),
        exbind: $ => choice(
            seq(
                field('name', seq(optional("op"), $.vid)),
                optional(seq("of", field('ty', $._ty))),
            ),
            seq(
                field('name', seq(optional("op"), $.vid)),
                "=",
                field('def', seq(optional("op"), $.longvid)),
            )
        ),

        local_dec: $ => seq(
            "local",
            field('decs', repeat(choice(";", $._dec))),
            "in",
            field('body', repeat(choice(";", $._dec))),
            "end"
        ),

        open_dec: $ => seq("open", repeat1($.longstrid)),

        infix_dec: $ => seq("infix", optional(/[0-9]/), repeat1($.vid)),
        infixr_dec: $ => seq("infixr", optional(/[0-9]/), repeat1($.vid)),
        nonfix_dec: $ => seq("nonfix", repeat1($.vid)),

        // ******************************************************** //
        // Patterns (Core)
        // ******************************************************** //

        _atpat: $ => choice(
            $.wildcard_pat,
            $.scon_pat,
            $.vid_pat,
            $.record_pat,
            $.unit_pat,
            $.tuple_pat,
            $.list_pat,
            ifExtAlt('vectorPat', $.vec_pat),
            $.paren_pat,
        ),

        wildcard_pat: $ => "_",
        scon_pat: $ => $._scon,
        vid_pat: $ => seq(optional("op"), $.longvid),
        record_pat: $ => mkBrakSepByCntFstLst(
            "{",
            commaSep,
            $._patrow, 0,
            false,
            {elt: $.ellipsis_patrow, rqd: false},
            "}"
        ),
        _patrow: $ => choice($.patrow, $.labvar_patrow),
        patrow: $ => seq($.lab, "=", $._pat),
        labvar_patrow: $ => seq(
            $.vid,
            optional(seq(":", $._ty)),
            optional(seq("as", $._pat))
        ),
        ellipsis_patrow: $ => seq("...", ifExtOpt('recordExt', seq("=", $._pat))),
        unit_pat: $ => prec(1, seq("(", ")")),
        tuple_pat: $ => mkBrakSepBy("(", commaSep, $._pat, ")"),
        list_pat: $ => mkBrakSepByCntFstLst(
            "[",
            commaSep,
            $._pat, 0,
            false,
            ifExtElse('listEllipsis', {elt: $.ellipsis_listpat, rqd: false}, false),
            "]"),
        ellipsis_listpat: $ => seq("...", "=", $._pat),
        vec_pat: $ => mkBrakSepBy("#[", commaSep, $._pat, ")"),
        paren_pat: $ => prec(1, seq("(", $._pat, ")")),

        // The Definition orders by decreasing precedence
        _pat: $ => choice(
            $._atpat,
            $.app_pat,
            $.typed_pat,
            ifExtElse('conjPat', $.conj_pat, $.as_pat),
            ifExtAlt(['orPat', 'disjPat'], $.disj_pat),
        ),

        app_pat: $ => prec(04, seq($._atpat, repeat1($._atpat))),
        typed_pat: $ => prec(03, seq($._pat, ":", $._ty)),
        as_pat: $ => prec.right(02, seq(optional("op"), $.vid, optional(seq(":", $._ty)), "as", $._pat)),
        conj_pat: $ => prec.right(02, seq($._pat, "as", $._pat)),
        disj_pat: $ => prec.left(01, seq($._pat, "|", $._pat)),

        // ******************************************************** //
        // Type expressions (Core)
        // ******************************************************** //

        _ty: $ => $._fn_ty,
        tyseq: $ => mkSeqAux($._atty, $._ty),

        _fn_ty: $ => choice($.fn_ty, $._tuple_ty),
        fn_ty: $ => seq($._tuple_ty, "->", $._fn_ty),

        _tuple_ty: $ => choice($.tuple_ty, $._paren_ty),
        tuple_ty: $ => mkSepBy2("*", $._paren_ty),

        _paren_ty: $ => choice($.paren_ty, $._atty),
        paren_ty: $ => seq("(", $._ty, ")"),

        _atty: $ => choice(
            $.tyvar_ty,
            $.record_ty,
            $.tycon_ty,
        ),

        tyvar_ty: $ => $.tyvar,
        record_ty: $ => mkBrakSepByCntFstLst(
            "{",
            commaSep,
            $.tyrow, 0,
            false,
            ifExtElse('recordExt', {elt: $.ellipsis_tyrow, rqd: false}, false),
            "}"
        ),
        tyrow: $ => seq($.lab, ":", $._ty),
        ellipsis_tyrow: $ => seq("...", ":", $._ty),
        tycon_ty: $ => seq(
            optional($.tyseq),
            $.longtycon
        ),

        // ******************************************************** //
        // Identifier Classes (Modules)
        // ******************************************************** //

        strid: $ => choice($._alphaAlphaNumeric_ident),
        longstrid: $ => seq(repeat(seq($.strid, ".")), $.strid),
        sigid: $ => choice($._alphaAlphaNumeric_ident),
        fctid: $ => choice($._alphaAlphaNumeric_ident),

        // ******************************************************** //
        // Structure Expressions (Modules)
        // ******************************************************** //

        _strexp: $ => choice(
            $.struct_strexp,
            $.strid_strexp,
            $.constr_strexp,
            $.fctapp_strexp,
            $.let_strexp,
        ),

        struct_strexp: $ => seq(
            "struct",
            repeat(choice(";", $._strdec)),
            "end"
        ),
        strid_strexp: $ => $.longstrid,
        constr_strexp: $ => seq($._strexp, choice(":", ":>"), $._sigexp),
        fctapp_strexp: $ => seq(
            $.fctid,
            "(",
            choice(
                $._strexp,
                repeat(choice(";", $._strdec))
            ),
            ")"
        ),
        let_strexp: $ => seq(
            "let",
            repeat(choice(";", $._strdec)),
            "in",
            $._strexp,
            "end"
        ),

        _strdec: $ => choice(
            $._dec_no_local,
            $.structure_strdec,
            $.local_strdec,
        ),

        structure_strdec: $ => seq("structure", $._strbind),
        _strbind: $ => mkSepBy1("and", $.strbind),
        strbind: $ => seq(
            field('name', $.strid),
            optional(seq(choice(":", ":>"), $._sigexp)),
            "=",
            $._strexp
        ),

        local_strdec: $ => seq(
            "local",
            repeat(choice(";", $._strdec)),
            "in",
            repeat(choice(";", $._strdec)),
            "end"
        ),

        // ******************************************************** //
        // Signature Expressions (Modules)
        // ******************************************************** //

        _sigexp: $ => choice(
            $.sig_sigexp,
            $.sigid_sigexp,
            $.wheretype_sigexp,
        ),

        sig_sigexp: $ => seq(
            "sig",
            repeat(choice(";", $._spec)),
            "end"
        ),
        sigid_sigexp: $ => $.sigid,
        wheretype_sigexp: $ => seq(
            $._sigexp,
            "where",
            mkSepBy1("and", seq(
                "type",
                optional($.tyvarseq),
                $.longtycon,
                "=",
                $._ty
            ))
        ),

        _sigdec: $ => choice(
            $.signature_sigdec,
        ),
        signature_sigdec: $ => seq("signature", $._sigbind),
        _sigbind: $ => mkSepBy1("and", $.sigbind),
        sigbind: $ => seq(
            field('name', $.sigid),
            "=",
            $._sigexp
        ),

        // ******************************************************** //
        // Specifications (Modules)
        // ******************************************************** //

        _spec: $ => choice(
            $.val_spec,
            $.type_spec,
            $.eqtype_spec,
            $.datatype_spec,
            $.datarepl_spec,
            $.exception_spec,
            $.structure_spec,
            $.include_spec,
            $.sharingtype_spec,
            $.sharing_spec,
        ),

        val_spec: $ => seq("val", $._valdesc),
        _valdesc: $ => mkSepBy1("and", $.valdesc),
        valdesc: $ => seq($.vid, ":", $._ty),

        type_spec: $ => seq("type", choice($._typedesc,$._typbind)),
        _typedesc: $ => mkSepBy1("and", $.typedesc),
        typedesc: $ => seq(
            optional($.tyvarseq),
            $.tycon
        ),

        eqtype_spec: $ => seq("eqtype", $._typedesc),

        datatype_spec: $ => seq(
            "datatype",
            $._datdesc,
            ifExtOpt('sigWithtype', field('withtype', seq("withtype", $._typbind)))
        ),
        _datdesc: $ => mkSepBy1("and", $.datdesc),
        datdesc: $ => seq(
            optional($.tyvarseq),
            $.tycon,
            "=",
            $._condesc
        ),
        _condesc: $ => seq(optBar, mkSepBy1("|", $.condesc)),
        condesc: $ => seq(
            field('name', $.vid),
            optional(seq("of", field('ty', $._ty)))
        ),

        datarepl_spec: $ => seq(
            "datatype",
            field('name', $.tycon),
            "=",
            "datatype",
            field('def', $.longtycon)
        ),

        exception_spec: $ => seq("exception", $._exdesc),
        _exdesc: $ => mkSepBy1("and", $.exdesc),
        exdesc: $ => seq(
            field('name', $.vid),
            optional(seq("of", field('ty', $._ty))),
        ),

        structure_spec: $ => seq("structure", $._strdesc),
        _strdesc: $ => mkSepBy1("and", $.strdesc),
        strdesc: $ => seq($.strid, ":", $._sigexp),

        include_spec: $ => seq("include", choice($._sigexp,seq($.sigid,repeat1($.sigid)))),

        sharingtype_spec: $ => seq("sharing", "type", mkSepBy2("=", $.longtycon)),

        sharing_spec: $ => seq("sharing", mkSepBy2("=", $.longstrid)),

        // ******************************************************** //
        // Functors (Modules)
        // ******************************************************** //

        _fctdec: $ => seq("functor", $._fctbind),
        _fctbind: $ => mkSepBy1("and", $.fctbind),
        fctbind: $ => seq(
            field('name', $.fctid),
            "(",
            choice(
                seq($.strid, ":", $._sigexp),
                repeat(choice(";", $._spec)),
            ),
            ")",
            optional(seq(choice(":",":>"), $._sigexp)),
            "=",
            $._strexp),

        // ******************************************************** //
        // Topdecs
        // ******************************************************** //

        _topdec: $ => choice(
            $._strdec,
            $._sigdec,
            $._fctdec
        ),

        // ******************************************************** //
        // Programs
        // ******************************************************** //

        _program: $ => seq(
            choice(repeat1($._topdec),$._exp),
            optional(seq(";", optional($._program)))
        ),

        // ******************************************************** //
        // Misc
        // ******************************************************** //

        _ident: $ => token(new RegExp(identRE)),

    },
});
