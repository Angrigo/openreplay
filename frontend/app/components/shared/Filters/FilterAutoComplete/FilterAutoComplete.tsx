import React, { useState, useEffect } from 'react';
import { Icon } from 'UI';
import APIClient from 'App/api_client';
import { debounce } from 'App/utils';
import stl from './FilterAutoComplete.module.css';
import colors from 'App/theme/colors';
import Select from 'react-select';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

const dropdownStyles = {
  option: (provided: any, state: any) => ({
    ...provided,
    whiteSpace: 'nowrap',
    width: '100%',
    minWidth: 150,
    transition: 'all 0.3s',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    backgroundColor: state.isFocused ? colors['active-blue'] : 'transparent',
    color: state.isFocused ? colors.teal : 'black',
    fontSize: '14px',
    '&:hover': {
      transition: 'all 0.2s',
      backgroundColor: colors['active-blue']
    },
    '&:focus': {
      transition: 'all 0.2s',
      backgroundColor: colors['active-blue']
    }
  }),
  control: (provided: any) => {
    const obj = {
      ...provided,
      border: 'solid thin transparent !important',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      height: '26px',
      minHeight: '26px',
      borderRadius: '.5rem',
      boxShadow: 'none !important'
    };
    return obj;
  },
  valueContainer: (provided: any) => ({
    ...provided,
    // paddingRight: '0px',
    width: 'fit-content',
    alignItems: 'center',
    height: '26px',
    padding: '0 3px'
  }),
  indicatorsContainer: (provided: any) => ({
    ...provided,
    padding: '0px',
    height: '26px'
  }),
  menu: (provided: any, state: any) => ({
    ...provided,
    top: 0,
    borderRadius: '3px',
    border: `1px solid ${colors['gray-light']}`,
    backgroundColor: '#fff',
    boxShadow: '1px 1px 1px rgba(0, 0, 0, 0.1)',
    position: 'absolute',
    width: 'unset',
    maxWidth: '300px',
    overflow: 'hidden',
    zIndex: 100
  }),
  menuList: (provided: any, state: any) => ({
    ...provided,
    padding: 0
  }),
  noOptionsMessage: (provided: any) => ({
    ...provided,
    whiteSpace: 'nowrap !important'
    // minWidth: 'fit-content',
  }),
  container: (provided: any) => ({
    ...provided,
    top: '18px',
    position: 'absolute'
  }),
  input: (provided: any) => ({
    ...provided,
    height: '22px',
    '& input:focus': {
      border: 'none !important'
    }
  }),
  singleValue: (provided: any, state: { isDisabled: any }) => {
    const opacity = state.isDisabled ? 0.5 : 1;
    const transition = 'opacity 300ms';

    return {
      ...provided,
      opacity,
      transition,
      display: 'flex',
      alignItems: 'center',
      height: '20px'
    };
  }
};

type FilterParam = { [key: string]: any };

function processKey(input: FilterParam): FilterParam {
  const result: FilterParam = {};
  for (const key in input) {
    if (input.type === 'metadata' && typeof input[key] === 'string' && input[key].startsWith('_')) {
      result[key] = input[key].substring(1);
    } else {
      result[key] = input[key];
    }
  }
  return result;
}

interface Props {
  showOrButton?: boolean;
  showCloseButton?: boolean;
  onRemoveValue?: () => void;
  onAddValue?: () => void;
  endpoint?: string;
  method?: string;
  params?: any;
  headerText?: string;
  placeholder?: string;
  onSelect: (e: any, item: any) => void;
  value: any;
  icon?: string;
  hideOrText?: boolean;
}

function FilterAutoComplete(props: Props) {
  const {
    showCloseButton = false,
    placeholder = 'Type to search',
    method = 'GET',
    showOrButton = false,
    onRemoveValue = () => null,
    onAddValue = () => null,
    endpoint = '',
    params = {},
    value = '',
    hideOrText = false
  } = props;

  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<any>([]);
  const [query, setQuery] = useState(value);
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [initialFocus, setInitialFocus] = useState(false);
  let selectRef: any = null;
  let inputRef: any = null;
  const { filterStore } = useStore();
  const _params = processKey(params);
  const [topValues, setTopValues] = useState<any>([]);
  const [topValuesLoading, setTopValuesLoading] = useState(false);

  useEffect(() => {
    const fetchValues = async () => {
      setTopValuesLoading(true);
      const values = await filterStore.getTopValues(_params.type);
      setTopValues(values);

      setTopValuesLoading(false);
      setLoading(false);
    };
    fetchValues().then(r => {
    });
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const loadOptions = (inputValue: string, callback: (options: []) => void) => {
    if (!inputValue.length) {
      setOptions(topValues.map((i: any) => ({ value: i.value, label: i.value })));
      callback(topValues.map((i: any) => ({ value: i.value, label: i.value })));
      setLoading(false);
      return;
    }

    // @ts-ignore
    new APIClient()
      [method?.toLocaleLowerCase()](endpoint, { ..._params, q: inputValue })
      .then((response: any) => {
        return response.json();
      })
      .then(({ data }: any) => {
        const _options = data.map((i: any) => ({ value: i.value, label: i.value })) || [];
        setOptions(_options);
        callback(_options);
        setLoading(false);
      })
      .catch((e) => {
        throw new Error(e);
      });
  };

  const debouncedLoadOptions = React.useCallback(debounce(loadOptions, 1000), [params, topValues]);

  const handleInputChange = (newValue: string) => {
    setLoading(true);
    setInitialFocus(true);
    setQuery(newValue);
    debouncedLoadOptions(newValue, (opt: any) => {
      selectRef?.focus();
    });
  };

  const onChange = (item: any) => {
    setMenuIsOpen(false);
    setQuery(item);
    props.onSelect(null, item);
  };

  const onFocus = () => {
    setInitialFocus(true);
    if (!query.length) {
      setLoading(topValuesLoading);
      setMenuIsOpen(!topValuesLoading && topValues.length > 0);
      setOptions(topValues.map((i: any) => ({ value: i.value, label: i.value })));
    } else {
      setMenuIsOpen(true);
    }
  };

  const onBlur = () => {
    setMenuIsOpen(false);
    props.onSelect(null, query);
  };

  const selected = value ? options.find((i: any) => i.value === query) : null;
  const uniqueOptions = options.filter((i: Record<string, string>) => i.value !== query);
  const selectOptionsArr = query.length ? [{ value: query, label: query }, ...uniqueOptions] : options;

  return (
    <div className="relative flex items-center">
      <div className={cn(stl.wrapper, 'relative')}>
        <input
          ref={(ref: any) => (inputRef = ref)}
          className="w-full rounded px-2 no-focus"
          value={query}
          onChange={({ target: { value } }: any) => handleInputChange(value)}
          onClick={onFocus}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          onKeyDown={(e: any) => {
            if (e.key === 'Enter') {
              inputRef?.blur();
            }
          }}
        />
        {loading && (
          <div className="absolute top-0 right-0" style={{
            marginTop: '5px',
            marginRight: !showCloseButton || (showCloseButton && !showOrButton) ? '34px' : '62px'
          }}>
            <Icon name="spinner" className="animate-spin" size="14" />
          </div>
        )}
        <Select
          ref={(ref: any) => {
            selectRef = ref;
          }}
          options={selectOptionsArr}
          value={selected}
          onChange={(e: any) => onChange(e.value)}
          menuIsOpen={initialFocus && menuIsOpen}
          menuPlacement="auto"
          styles={dropdownStyles}
          components={{
            Control: ({ children, ...props }: any) => <></>
          }}
        />
        <div className={stl.right}>
          {showCloseButton && (
            <div onClick={props.onRemoveValue}>
              <Icon name="close" size="12" />
            </div>
          )}
          {showOrButton && (
            <div onClick={props.onAddValue} className="color-teal">
              <span className="px-1">or</span>
            </div>
          )}
        </div>
      </div>

      {!showOrButton && !hideOrText && <div className="ml-3">or</div>}
    </div>
  );
}

export default observer(FilterAutoComplete);
