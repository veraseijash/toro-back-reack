import { Repository } from 'typeorm';
import { Examlists } from './examlists.entity';
import { ExamListsService } from './examlists.service';
import { UpdateGroupCostsDto } from './dto/update-group-costs.dto';

describe('ExamListsService.updateGroupCosts', () => {
  const find = jest.fn();
  const update = jest.fn();
  const transaction = jest.fn();
  let service: ExamListsService;

  beforeEach(() => {
    jest.resetAllMocks();
    transaction.mockImplementation((callback) =>
      callback({ getRepository: () => ({ find, update }) }),
    );
    service = new ExamListsService({
      manager: { transaction },
    } as unknown as Repository<Examlists>);
  });

  it('uses original decimal costs, rounds and updates every matching exam', async () => {
    find.mockResolvedValue([
      { id: 1, cost1: '100.00', cost2: '51.00', cost3: '25.00' },
      { id: 2, cost1: '200.00', cost2: '10.00', cost3: '15.00' },
    ]);
    const result = await service.updateGroupCosts({
      group_id: 1,
      cambios: [
        { aplicar: 'cost2', incremento: 10, sobre: 'cost3' },
        { aplicar: 'cost1', incremento: 30, sobre: 'cost2' },
      ],
    });
    expect(find).toHaveBeenCalledWith({
      where: { group_id: 1 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(update).toHaveBeenNthCalledWith(1, 1, { cost1: 115, cost2: 54 });
    expect(update).toHaveBeenNthCalledWith(2, 2, { cost1: 203, cost2: 12 });
    expect(result).toEqual({ group_id: 1, updated: 2 });
  });

  it('updates all groups without a filter when group_id is zero', async () => {
    find.mockResolvedValue([
      { id: 1, group_id: 1, cost1: '100.00', cost2: '50.00' },
      { id: 2, group_id: 2, cost1: '200.00', cost2: '10.00' },
      { id: 3, group_id: 0, cost1: '10.00', cost2: '5.00' },
    ]);
    await expect(
      service.updateGroupCosts({
        group_id: 0,
        cambios: [{ aplicar: 'cost1', sobre: 'cost2', incremento: 30 }],
      }),
    ).resolves.toEqual({ group_id: 0, updated: 3 });
    expect(find).toHaveBeenCalledWith({ lock: { mode: 'pessimistic_write' } });
    expect(update).toHaveBeenCalledTimes(3);
    expect(update).toHaveBeenNthCalledWith(1, 1, { cost1: 115 });
    expect(update).toHaveBeenNthCalledWith(2, 2, { cost1: 203 });
    expect(update).toHaveBeenNthCalledWith(3, 3, { cost1: 12 });
  });

  it('allows the same source and target cost', async () => {
    find.mockResolvedValue([{ id: 1, cost6: '105.00' }]);
    await service.updateGroupCosts({
      group_id: 1,
      cambios: [{ aplicar: 'cost6', sobre: 'cost6', incremento: 10 }],
    });
    expect(update).toHaveBeenCalledWith(1, { cost6: 116 });
  });

  it.each([
    {
      group_id: -1,
      cambios: [{ aplicar: 'cost1', sobre: 'cost2', incremento: 10 }],
    },
    { group_id: 0, cambios: [] },
    { group_id: 1, cambios: [] },
    {
      group_id: 1,
      cambios: [{ aplicar: 'description', sobre: 'cost1', incremento: 10 }],
    },
    {
      group_id: 1,
      cambios: [{ aplicar: 'cost1', sobre: 'cost7', incremento: 10 }],
    },
    {
      group_id: 1,
      cambios: [{ aplicar: 'cost1', sobre: 'cost2', incremento: '10' }],
    },
    {
      group_id: 1,
      cambios: [{ aplicar: 'cost1', sobre: 'cost2', incremento: -1 }],
    },
    { group_id: 1, cambios: [null] },
    {
      group_id: 1,
      cambios: Array(2).fill({
        aplicar: 'cost1',
        sobre: 'cost2',
        incremento: 10,
      }),
    },
  ])('rejects invalid input before writing: %j', async (request) => {
    await expect(
      service.updateGroupCosts(request as UpdateGroupCostsDto),
    ).rejects.toMatchObject({ status: 400 });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('returns zero when no exam matches', async () => {
    find.mockResolvedValue([]);
    await expect(
      service.updateGroupCosts({
        group_id: 99,
        cambios: [{ aplicar: 'cost1', sobre: 'cost2', incremento: 30 }],
      }),
    ).resolves.toEqual({ group_id: 99, updated: 0 });
    expect(update).not.toHaveBeenCalled();
  });
});
