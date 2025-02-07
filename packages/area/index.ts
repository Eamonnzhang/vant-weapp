import { VantComponent } from '../common/component';
import { pickerProps } from '../picker/shared';
import { Weapp } from 'definitions/weapp';

type AreaItem = {
  name: string;
  code: string;
};

VantComponent({
  classes: ['active-class', 'toolbar-class', 'column-class'],

  props: {
    ...pickerProps,
    value: String,
    areaList: {
      type: Object,
      value: {}
    },
    columnsNum: {
      type: null,
      value: 3
    }
  },

  data: {
    columns: [{ values: [] }, { values: [] }, { values: [] }],
    displayColumns: [{ values: [] }, { values: [] }, { values: [] }]
  },

  watch: {
    value(value: string) {
      this.code = value;
      this.setValues();
    },

    areaList: 'setValues',

    columnsNum(value: number) {
      this.set({
        displayColumns: this.data.columns.slice(0, +value)
      });
    }
  },

  mounted() {
    setTimeout(() => {
      this.setValues();
    }, 0);
  },

  methods: {
    getPicker() {
      if (this.picker == null) {
        this.picker = this.selectComponent('.van-area__picker');
      }
      return this.picker;
    },

    onCancel(event: Weapp.Event) {
      this.emit('cancel', event.detail);
    },

    onConfirm(event: Weapp.Event) {
      this.emit('confirm', event.detail);
    },

    emit(type: string, detail) {
      detail.values = detail.value;
      delete detail.value;
      this.$emit(type, detail);
    },

    onChange(event: Weapp.Event) {
      const { index, picker, value } = event.detail;
      this.code = value[index].code;
      this.setValues().then(() => {
        this.$emit('change', {
          picker,
          values: picker.getValues(),
          index
        });
      });
    },

    getConfig(type: string) {
      const { areaList } = this.data;
      return (areaList && areaList[`${type}_list`]) || {};
    },

    getList(type: string, code?: string): AreaItem[] {
      let result = [];
      if (type !== 'province' && !code) {
        return result;
      }

      const list = this.getConfig(type);
      result = Object.keys(list).map(code => ({
        code,
        name: list[code]
      }));

      if (code) {
        // oversea code
        if (code[0] === '9' && type === 'city') {
          code = '9';
        }

        result = result.filter(item => item.code.indexOf(code) === 0);
      }

      return result;
    },

    getIndex(type: string, code: string): number {
      let compareNum = type === 'province' ? 2 : type === 'city' ? 4 : 6;
      const list = this.getList(type, code.slice(0, compareNum - 2));

      // oversea code
      if (code[0] === '9' && type === 'province') {
        compareNum = 1;
      }

      code = code.slice(0, compareNum);
      for (let i = 0; i < list.length; i++) {
        if (list[i].code.slice(0, compareNum) === code) {
          return i;
        }
      }

      return 0;
    },

    setValues() {
      const county = this.getConfig('county');
      let code = this.code || Object.keys(county)[0] || '';
      const province = this.getList('province');
      const city = this.getList('city', code.slice(0, 2));

      const picker = this.getPicker();

      if (!picker) {
        return;
      }

      const stack = [];

      stack.push(picker.setColumnValues(0, province, false));
      stack.push(picker.setColumnValues(1, city, false));

      if (city.length && code.slice(2, 4) === '00') {
        [{ code }] = city;
      }

      stack.push(
        picker.setColumnValues(
          2,
          this.getList('county', code.slice(0, 4)),
          false
        )
      );

      return Promise.all(stack)
        .catch(() => {})
        .then(() =>
          picker.setIndexes([
            this.getIndex('province', code),
            this.getIndex('city', code),
            this.getIndex('county', code)
          ])
        )
        .catch(() => {});
    },

    getValues() {
      const picker = this.getPicker();
      return picker ? picker.getValues().filter(value => !!value) : [];
    },

    getDetail() {
      const values = this.getValues();
      const area = {
        code: '',
        country: '',
        province: '',
        city: '',
        county: ''
      };

      if (!values.length) {
        return area;
      }

      const names = values.map((item: AreaItem) => item.name);
      area.code = values[values.length - 1].code;
      if (area.code[0] === '9') {
        area.country = names[1] || '';
        area.province = names[2] || '';
      } else {
        area.province = names[0] || '';
        area.city = names[1] || '';
        area.county = names[2] || '';
      }

      return area;
    },

    reset(code) {
      this.code = code || '';
      return this.setValues();
    }
  }
});
