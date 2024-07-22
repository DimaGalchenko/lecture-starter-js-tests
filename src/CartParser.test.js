import CartParser from './CartParser';
import {readFileSync} from "fs";
import * as idGenerator from "uuid";
import cart from '../samples/cart.json';

jest.mock('fs');
jest.mock('uuid')

let parser;

beforeEach(() => {
    parser = new CartParser();
    jest.clearAllMocks();
});

describe('CartParser - unit tests', () => {

    describe('readFile tests', () => {
        it('should read file correctly', function () {
            // given
            const mockPath = 'test.csv';
            const mockData = 'Product name,Price,Quantity\nMollis consequat,9.00,3';
            readFileSync.mockReturnValue(mockData);

            // when
            const result = parser.readFile(mockPath);

            // then
            expect(result).toBe(mockData);
            expect(readFileSync).toHaveBeenCalledTimes(1);
            expect(readFileSync).toHaveBeenCalledWith(mockPath, 'utf-8', 'r');
        });
    })

    describe('validate tests', () => {
        it('should validate correct headers', function () {
            // given
            const mockData = 'Product name,Price,Quantity\nMollis consequat,9.00,3';

            // when
            const errors = parser.validate(mockData);

            // then
            expect(errors.length).toEqual(0);
        });

        it('should validate incorrect headers and return error', function () {
            // given
            const mockData = 'Product name,Incorrect header,Quantity\nMollis consequat,9.00,3';

            // when
            const errors = parser.validate(mockData);

            // then
            expect(errors.length).toEqual(1);
            expect(errors[0].message).toBe('Expected header to be named "Price" but received Incorrect header.');
        });

        it('should return error when there is/are missing cell(s)', function () {
            // given
            const mockData = 'Product name,Price,Quantity\nMollis consequat,3';

            // when
            const errors = parser.validate(mockData);

            // then
            expect(errors.length).toEqual(1);
            expect(errors[0].message).toBe('Expected row to have 3 cells but received 2.');

        });

        it('should return error when there is/are non-positive number(s) in a cell', function () {
            // given
            const mockData = 'Product name,Price,Quantity\nMollis consequat,-9.00,3';

            // when
            const errors = parser.validate(mockData);

            // then
            expect(errors.length).toEqual(1);
            expect(errors[0].message).toBe('Expected cell to be a positive number but received "-9.00".');

        });

        it('should return errors when there are 2 and more validation failures', function () {
            // given
            const mockData = 'Product name,Incorrect Price,Quantity\nMollis consequat,-9.00,3';

            // when
            const errors = parser.validate(mockData);

            // then
            expect(errors.length).toEqual(2);
            expect(errors[0].message).toBe('Expected header to be named "Price" but received Incorrect Price.');
            expect(errors[1].message).toBe('Expected cell to be a positive number but received "-9.00".');
        });
    })

    describe('parseLine tests', () => {
        it('should parse a valid line', function () {
            // given
            idGenerator.v4.mockReturnValue('test-uuid');
            const mockLine = 'Scelerisque lacinia,18.90,2';

            // when
            const result = parser.parseLine(mockLine);

            // then
            expect(result).toEqual({
                name: 'Scelerisque lacinia',
                price: 18.90,
                quantity: 2,
                id: 'test-uuid'
            });
        });
    });

    describe('calcTotal tests', function () {
        it('should calculate total correctly', function () {
            // given
            const items = [
                {price: 3, quantity: 2},
                {price: 2.5, quantity: 2}
            ];

            // when
            const total = parser.calcTotal(items);

            // then
            expect(total).toBe(11);
        });
    });

    describe('parse tests', function () {
        it('should throw an error if at least 1 validation failed', function () {
            // given
            const mockData = 'Product name,Incorrect Price,Quantity\nMollis consequat,-9.00,3';
            const mockPath = 'test.csv';
            readFileSync.mockReturnValue(mockData);

            // then
            expect(() => parser.parse(mockPath)).toThrow('Validation failed!');
        });

        it('should parse file correctly if validation passes', function () {
            // given
            idGenerator.v4.mockReturnValue('test-uuid');
            const mockPath = 'test.csv';
            const mockData = 'Product name,Price,Quantity\n' +
                'Mollis consequat,9.00,3\n' +
                'Tvoluptatem,10.32,2';
            readFileSync.mockReturnValue(mockData);

            // when
            const result = parser.parse(mockPath);

            // then
            expect(result).toEqual({
                items: [
                    {name: 'Mollis consequat', price: 9.00, quantity: 3, id: 'test-uuid'},
                    {name: 'Tvoluptatem', price: 10.32, quantity: 2, id: 'test-uuid'},
                ],
                total: 47.64
            });
        });

        it('should return empty array and total equal zero when csv file contains only headers', function () {
            // given
            idGenerator.v4.mockReturnValue('test-uuid');
            const mockPath = 'test.csv';
            const mockData = 'Product name,Price,Quantity\n';
            readFileSync.mockReturnValue(mockData);

            // when
            const result = parser.parse(mockPath);

            // then
            expect(result).toEqual({
                items: [],
                total: 0
            });
        });
    });
});

const fs = jest.requireActual('fs');

describe('CartParser - integration test', () => {
    it('should parse and calculate total for valid CSV', () => {
        readFileSync.mockImplementation((...args) => fs.readFileSync(...args))

        // given
        const pathToFile = './samples/cart.csv';

        // when
        const parser = new CartParser();
        const result = parser.parse(pathToFile);

        // then
        const items = result.items;
        cart.items.forEach(item => item.id = undefined)

        expect(result).toHaveProperty('items');
        expect(result).toHaveProperty('total');
        expect(items).toHaveLength(5);
        expect(items[0]).toMatchObject(cart.items[0]);
        expect(items[1]).toMatchObject(cart.items[1]);
        expect(items[2]).toMatchObject(cart.items[2]);
        expect(items[3]).toMatchObject(cart.items[3]);
        expect(items[4]).toMatchObject(cart.items[4]);
        expect(result.total).toBe(cart.total);
    });
});
